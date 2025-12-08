import {
	buildModerationButtons,
	CUSTOM_ID_PREFIX,
	deleteModerationCache,
	fetchChannel,
	fetchUser,
	getMessageWithKeyPart,
	getModerationCache,
	getUserId,
	makeEmbedKey,
	parseEmbedKey,
	parseKeyFromCustomId,
	putModerationCache,
	reuploadAvatar,
	setModerationFooter,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { evalStatsDice, isNumber, roll } from "@dicelette/core";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { Translation, UserMessageId, UserRegistration } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	capitalizeBetweenPunct,
	logger,
	profiler,
	QUERY_URL_PATTERNS,
} from "@dicelette/utils";
import { getUserNameAndChar, registerUser, updateMemory } from "database";
import type { TextChannel } from "discord.js";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	displayOldAndNewStats,
	getEmbeds,
	removeEmbedsFromList,
	replaceEmbedInList,
	reply,
	sendLogs,
	stripFooter,
} from "messages";
import { editUserButtons, selectEditMenu, selfRegisterAllowance } from "utils";
import { sendValidationMessage } from "../user";

const botErrorOptions: BotErrorOptions = {
	cause: "DICE_VALIDATION",
	level: BotErrorLevel.Warning,
};

/**
 * Validates and applies dice edits from a Discord modal interaction, updating or removing dice embeds in the message as needed.
 *
 * Parses user-submitted dice input, checks for validity against character stats, updates the message embed fields accordingly, and manages user registration and logging. If all dice are removed or invalid, the dice embed is deleted from the message.
 *
 * @throws {Error} If a dice string is invalid or cannot be evaluated against character stats.
 */
export async function validate(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	client: EClient
) {
	profiler.startProfiler();
	const db = client.settings;
	if (!interaction.message) return;
	const message = await (interaction.channel as TextChannel).messages.fetch(
		interaction.message.id
	);
	const allowance = selfRegisterAllowance(
		client.settings.get(interaction.guild!.id, "allowSelfRegister")
	);
	const isModerator = interaction.guild?.members.cache
		.get(interaction.user.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);

	/**
	 * Set the flags ephemeral only if we DONT HAVE to go through moderation
	 */
	const flags =
		allowance.moderation && allowance.allowSelfRegister && !isModerator
			? undefined
			: Djs.MessageFlags.Ephemeral;
	await interaction.deferReply({ flags });
	const diceEmbeds = getEmbeds(message ?? undefined, "damage");
	if (!diceEmbeds) return;
	// 1) Creation + validation of embeds
	const values = interaction.fields.getTextInputValue("allDice");
	const { fieldsToAppend, diceEmbed, oldFields, removed } = createAndValidateDiceEmbed(
		values,
		message,
		ul
	);
	// Permission/Moderation: switch to moderation flow if needed
	const { userID, userName } = await getUserNameAndChar(interaction, ul);
	const messageID = [message.id, message.channelId] as UserMessageId;

	if (allowance.moderation && allowance.allowSelfRegister && !isModerator) {
		// Store the embed in the cache and publish a message for approval
		const embedKey = makeEmbedKey(interaction.guild!.id, message.channelId, message.id);
		// Fallback footer: retains a minimum amount of metadata if the cache disappears
		setModerationFooter(diceEmbed, {
			channelId: message.channelId,
			messageId: message.id,
			userID,
			userName,
		});
		putModerationCache(embedKey, {
			embed: diceEmbed,
			kind: "dice-edit",
			meta: { channelId: message.channelId, messageId: message.id, userID, userName },
		});

		const row = buildModerationButtons("dice-edit", ul, embedKey);
		// If the embed is empty (all macros removed), display a small message rather than an empty embed.
		if (!fieldsToAppend || fieldsToAppend.length === 0) {
			await interaction.editReply({
				components: [row],
				content: ul("modals.removed.dice"),
			});
		} else await interaction.editReply({ components: [row], embeds: [diceEmbed] });
		//ping moderators in the channel
		const url = await interaction.fetchReply();
		await sendValidationMessage(interaction, interaction.user, ul, client, url.url);
		return; // do not apply changes directly
	}

	// 2) Edit the message with the new embeds
	const edited = await editMessageDiceEmbeds(message, ul, diceEmbed, removed);

	// 3) Persist memory + user
	const damageNames = removed
		? undefined
		: Object.keys(
				fieldsToAppend.reduce(
					(acc, field) => {
						acc[field.name] = field.value;
						return acc;
					},
					{} as Record<string, string>
				)
			);
	await persistUserAndMemory(
		client,
		interaction,
		userID,
		userName,
		messageID,
		ul,
		edited.embeds,
		damageNames
	);

	// 4) Responses/logs
	await sendValidationResponses({
		db,
		interaction,
		message,
		newFields: fieldsToAppend,
		oldFields,
		removed,
		ul,
		userID,
		userName,
	});
	profiler.stopProfiler();
}

/**
 * Parse the fields in stats, used to fix combinaison and get only them and not their result
 */
function parseStatsString(statsEmbed: Djs.EmbedBuilder) {
	const stats = parseEmbedFields(statsEmbed.toJSON() as Djs.Embed);
	const parsedStats: Record<string, number> = {};
	for (const [name, value] of Object.entries(stats)) {
		let number = Number.parseInt(value, 10);
		if (!isNumber(value)) {
			const combinaison = value.replace(/`(.*)` =/, "").trim();
			number = Number.parseInt(combinaison, 10);
		}
		parsedStats[name] = number;
	}
	return parsedStats;
}

/**
 * Compare two strings after unidecode and standardize them
 */
const COMPARE_UNIDECODE = (a: string, b: string) =>
	a.unidecode().standardize() === b.unidecode().standardize();

/**
 * 1) Creation and validation of dice embeds based on user input.
 */
function createAndValidateDiceEmbed(
	values: string,
	message: Djs.Message,
	ul: Translation
) {
	const diceEmbeds = getEmbeds(message ?? undefined, "damage");
	if (!diceEmbeds)
		return {
			diceEmbed: createDiceEmbed(ul),
			fieldsToAppend: [],
			oldFields: [],
			removed: true,
		};

	const valuesAsDice = values.split("\n- ").map((dice) => {
		const match = dice.match(/^([^:]+):(.*)$/s);
		if (match) {
			return {
				name: match[1].trim().replace(/^- /, "").toLowerCase(),
				value: match[2].trim(),
			};
		}
		const [name, value] = dice.split(/ ?: ?/);
		return { name: name.replace(/^- /, "").trim().toLowerCase(), value };
	});

	const dices = valuesAsDice.reduce(
		(acc, { name, value }) => {
			acc[name] = value;
			return acc;
		},
		{} as Record<string, string>
	);

	const newEmbedDice: Djs.APIEmbedField[] = [];
	for (const [skill, dice] of Object.entries(dices)) {
		if (newEmbedDice.find((field) => COMPARE_UNIDECODE(field.name, skill))) continue;
		if (dice.toLowerCase() === "x" || dice.trim().length === 0 || dice === "0") {
			newEmbedDice.push({ inline: true, name: skill.capitalize(), value: "X" });
			continue;
		}
		const statsEmbeds = getEmbeds(message ?? undefined, "stats");
		if (!statsEmbeds) {
			if (!roll(dice))
				throw new BotError(ul("error.invalidDice.withDice", { dice }), botErrorOptions);
			continue;
		}
		const statsValues = parseStatsString(statsEmbeds);
		try {
			evalStatsDice(dice, statsValues);
		} catch (error) {
			logger.warn(error);
			throw new BotError(ul("error.invalidDice.eval", { dice }), botErrorOptions);
		}
		newEmbedDice.push({ inline: true, name: skill.capitalize(), value: `\`${dice}\`` });
	}

	const oldDice = diceEmbeds.toJSON().fields;
	if (oldDice) {
		for (const field of oldDice) {
			const name = field.name.toLowerCase();
			const newValue = newEmbedDice.find((f) => COMPARE_UNIDECODE(f.name, name));
			if (!newValue)
				newEmbedDice.push({ inline: true, name: name.capitalize(), value: field.value });
		}
	}

	const fieldsToAppend: Djs.APIEmbedField[] = [];
	for (const field of newEmbedDice) {
		const name = field.name.toLowerCase();
		const dice = field.value;
		if (
			fieldsToAppend.find((f) => COMPARE_UNIDECODE(f.name, name)) ||
			dice.toLowerCase() === "x" ||
			dice.trim().length === 0 ||
			dice === "0"
		)
			continue;
		fieldsToAppend.push({
			inline: true,
			name: capitalizeBetweenPunct(name.capitalize()),
			value: dice,
		});
	}

	const diceEmbed = createDiceEmbed(ul).addFields(fieldsToAppend);
	const removed = !fieldsToAppend || fieldsToAppend.length === 0;
	return { diceEmbed, fieldsToAppend, oldFields: oldDice ?? [], removed };
}

/**
 * 2) Edit the message with the correct embeds (and components if deleted).
 */
async function editMessageDiceEmbeds(
	message: Djs.Message,
	ul: Translation,
	diceEmbed: Djs.EmbedBuilder,
	removed: boolean
): Promise<{ embeds: Djs.EmbedBuilder[] }> {
	const embedsList = await replaceEmbedInList(
		ul,
		{ embed: diceEmbed, which: "damage" },
		message
	);
	if (removed) {
		const toAdd = removeEmbedsFromList(embedsList.list, "damage");
		const components = editUserButtons(ul, embedsList.exists.stats, false);
		await message.edit({
			components: [components, selectEditMenu(ul)],
			embeds: toAdd,
			files: embedsList.files,
		});
		return { embeds: toAdd };
	}
	await message.edit({ embeds: embedsList.list, files: embedsList.files });
	return { embeds: embedsList.list };
}

/**
 * 3) Persistence of memory and user backup.
 */
async function persistUserAndMemory(
	client: EClient,
	interaction: Djs.BaseInteraction,
	userID: string,
	userName: string | undefined,
	messageID: UserMessageId,
	ul: Translation,
	embeds: Djs.EmbedBuilder[],
	damage: string[] | undefined
) {
	await updateMemory(client.characters, interaction.guild!.id, userID, ul, { embeds });
	const userRegister: UserRegistration = {
		charName: userName,
		damage,
		msgId: messageID,
		userID,
	};
	await registerUser(userRegister, interaction, client.settings, false);
}

/**
 * 4) Send validation responses and logs.
 */
async function sendValidationResponses(args: {
	interaction: Djs.ModalSubmitInteraction | Djs.ButtonInteraction;
	ul: Translation;
	removed: boolean;
	oldFields: Djs.APIEmbedField[] | undefined;
	newFields: Djs.APIEmbedField[];
	userID: string;
	userName?: string;
	message: Djs.Message;
	db: EClient["settings"];
}) {
	const {
		interaction,
		ul,
		removed,
		oldFields,
		newFields,
		userID,
		userName,
		message,
		db,
	} = args;
	if (removed) {
		await reply(interaction, {
			content: ul("modals.removed.dice"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		//count the number of removed fields for the logs
		const count = oldFields?.length ?? 0;
		await sendLogs(
			ul("logs.dice.remove", {
				char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
				count,
				fiche: message.url,
				user: Djs.userMention(interaction.user.id),
			}),
			interaction.guild as Djs.Guild,
			db
		);
		return;
	}
	const compare = displayOldAndNewStats(oldFields ?? [], newFields);
	const count = compare.added + compare.changed + compare.removed;
	await reply(interaction, {
		content: ul("embed.edit.dice", {
			count,
		}),
		flags: Djs.MessageFlags.Ephemeral,
	});
	const logMessage = ul("logs.dice.edit", {
		char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
		count,
		fiche: message.url,
		user: Djs.userMention(interaction.user.id),
	});
	await sendLogs(
		`${logMessage}\n${compare.stats}`.trim(),
		interaction.guild as Djs.Guild,
		db
	);
}

/**
 *  Validation by a moderator for dice editing (via button).
 */
export async function couldBeValidatedDice(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	client: EClient
) {
	// Check moderator permissions
	const moderator = interaction.guild?.members.cache
		.get(interaction.user.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (!moderator) {
		await reply(interaction, {
			content: ul("modals.onlyModerator"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	const customId = interaction.customId;
	const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.diceEdit.validate, customId);
	if (!embedKey) throw new BotError(ul("error.embed.notFound"), botErrorOptions);

	// Retrieve the embed from cache or message
	const cached = getModerationCache(embedKey);
	let workingEmbed: Djs.EmbedBuilder | undefined =
		cached && cached.kind === "dice-edit" ? cached.embed : undefined;

	// Fallback: reconstruct from the message if cache is missing
	if (!workingEmbed) {
		const apiEmbed = interaction.message.embeds[0];
		// If no embed found, create a new one
		if (!apiEmbed) {
			workingEmbed = createDiceEmbed(ul);
		} else {
			// Rebuild the embed from the message
			workingEmbed = new Djs.EmbedBuilder(apiEmbed.toJSON() as Djs.APIEmbed);
		}
	}
	if (!workingEmbed) throw new BotError(ul("error.embed.notFound"), botErrorOptions);

	// Get the original message to edit
	const message = await getMessageWithKeyPart(ul, interaction, embedKey);
	// Prepare new fields/flags
	const newFields = workingEmbed.toJSON().fields ?? [];
	const removed = newFields.length === 0;

	// 1) Save and edit the message
	const oldDamage = getEmbeds(message ?? undefined, "damage");
	const oldFields = oldDamage?.toJSON().fields ?? [];
	workingEmbed = workingEmbed.setFooter(null);
	const edited = await editMessageDiceEmbeds(
		message,
		ul,
		stripFooter(workingEmbed),
		removed
	);

	// 2) Memory persistence + user (damageNames from the fields of the new embed)
	const damageNames = removed
		? undefined
		: Object.keys(
				(newFields as Djs.APIEmbedField[]).reduce(
					(acc, field) => {
						acc[field.name] = field.value;
						return acc;
					},
					{} as Record<string, string>
				)
			);
	// Get user ID and name from the user embed
	const userEmbed = getEmbeds(message ?? undefined, "user");
	if (!userEmbed) throw new BotError(ul("error.embed.notFound"), botErrorOptions);
	const parsedUser = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
	const mention = parsedUser["common.user"]; // e.g., <@123>
	const idMatch = mention?.match(/<@(?<id>\d+)>/);
	const ownerId = idMatch?.groups?.id ?? mention?.replace(/<@|>/g, "");
	const charNameRaw = parsedUser["common.character"];
	const ownerName =
		charNameRaw && charNameRaw.toLowerCase() !== ul("common.noSet").toLowerCase()
			? charNameRaw
			: undefined;

	await persistUserAndMemory(
		client,
		interaction,
		ownerId!,
		ownerName,
		[message.id, message.channelId],
		ul,
		edited.embeds,
		damageNames
	);

	// 3) Responses/logs
	await sendValidationResponses({
		db: client.settings,
		interaction,
		message,
		newFields: newFields as Djs.APIEmbedField[],
		oldFields,
		removed,
		ul,
		userID: ownerId!,
		userName: ownerName,
	});

	// 4) Cleanup
	deleteModerationCache(embedKey);
	await interaction.message.delete();
}

/** Canceling a validation request through moderation (button). */
export async function cancelDiceModeration(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	client: EClient
) {
	const customId = interaction.customId;
	const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.diceEdit.cancel, customId);
	const { userId, url } = getUserId(interaction);
	if (embedKey) deleteModerationCache(embedKey);
	const samePerson = interaction.user.id === userId;
	let content = ul("modals.cancelled", { url });
	if (samePerson) content = ul("modals.cancelled_by_user", { url });
	await interaction.message.delete();
	await reply(interaction, {
		content,
		flags: Djs.MessageFlags.Ephemeral,
	});
	if (userId && !samePerson) {
		const user = await fetchUser(client, userId);
		if (user) await user.send(content);
	}
}

/**
 * Validation by a moderator for adding dice (via button).
 */
export async function couldBeValidatedDiceAdd(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	client: EClient
) {
	const moderator = interaction.guild?.members.cache
		.get(interaction.user.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (!moderator) {
		await reply(interaction, {
			content: ul("modals.onlyModerator"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const customId = interaction.customId;
	const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.diceAdd.validate, customId);
	if (!embedKey) throw new BotError(ul("error.embed.notFound"), botErrorOptions);
	const cachedRaw = getModerationCache(embedKey);
	const cached = cachedRaw && cachedRaw.kind === "dice-add" ? cachedRaw : undefined;

	let targetChannelId: string | undefined;
	let targetMessageId: string | undefined;
	let userID: string | undefined;
	let userName: string | undefined;
	let moderationDiceEmbed: Djs.EmbedBuilder | undefined;

	if (cached) {
		targetChannelId = cached.meta.channelId;
		targetMessageId = cached.meta.messageId;
		userID = cached.meta.userID;
		userName = cached.meta.userName;
	} else {
		// Fallback: use the key encoded in the customId to retrieve the original message
		const apiEmbed = interaction.message.embeds[0];
		if (!apiEmbed) throw new BotError(ul("error.embed.notFound"), botErrorOptions);
		moderationDiceEmbed = new Djs.EmbedBuilder(apiEmbed.toJSON() as Djs.APIEmbed);
		const keyParts = parseEmbedKey(embedKey);
		if (!keyParts) throw new BotError(ul("error.embed.notFound"), botErrorOptions);
		targetChannelId = keyParts.channelId;
		targetMessageId = keyParts.messageId;
	}

	const channel = await fetchChannel(interaction.guild!, targetChannelId!);
	if (!channel || !channel.isTextBased())
		throw new BotError(ul("error.channel.notFound"), botErrorOptions);
	const message = await channel.messages.fetch(targetMessageId!);
	const userEmbed = getEmbeds(message ?? undefined, "user");
	if (!userEmbed) throw new BotError(ul("error.embed.notFound"), botErrorOptions);

	// Keep field in case of cache miss
	const oldDamage = getEmbeds(message ?? undefined, "damage");
	const oldFields = oldDamage?.toJSON().fields ?? [];

	// Prepare the new list of embeds and expected components (edit buttons)
	let embedsApplied: Djs.EmbedBuilder[];
	let hasStats: boolean;
	let files: Djs.AttachmentBuilder[] | undefined;
	if (cached) {
		embedsApplied = cached.embeds;
		hasStats = !!getEmbeds(undefined, "stats", cached.embeds);
		// Clean up the footer of the macro embed, if present
		const damage = getEmbeds(undefined, "damage", embedsApplied);
		if (damage?.toJSON().footer) {
			const damageTitle = damage.toJSON().title ?? "";
			const sanitized = stripFooter(damage);
			embedsApplied = embedsApplied.map((e) =>
				(e.toJSON().title ?? "") === damageTitle ? sanitized : e
			);
			// Update files if an avatar reupload is needed
			const userEmbed = getEmbeds(undefined, "user", embedsApplied);
			const thumbnail = userEmbed?.data.thumbnail?.url;
			if (thumbnail?.match(QUERY_URL_PATTERNS.DISCORD_CDN)) {
				const res = await reuploadAvatar(
					{
						name: thumbnail.split("?")[0].split("/").pop() ?? "avatar.png",
						url: thumbnail,
					},
					ul
				);
				const sanitizedUserEmbed = userEmbed!.setThumbnail(res.name);
				embedsApplied = embedsApplied.map((e) =>
					(e.toJSON().title ?? "") === (userEmbed!.toJSON().title ?? "")
						? sanitizedUserEmbed
						: e
				);
				files = [res.newAttachment];
			}
		}
	} else {
		// Fallback: merge the dice embed with existing embeds
		const diceEmbedToApply = stripFooter(moderationDiceEmbed!);
		const edited = await replaceEmbedInList(
			ul,
			{ embed: diceEmbedToApply, which: "damage" },
			message
		);
		embedsApplied = edited.list;
		hasStats = edited.exists.stats;
		files = edited.files;
	}
	const components = [editUserButtons(ul, hasStats, true), selectEditMenu(ul)];

	await message.edit({ components, embeds: embedsApplied, files });

	// Persist memory + user
	const newDamage = getEmbeds(message ?? undefined, "damage");
	const newFields = newDamage?.toJSON().fields ?? [];
	const damageNames = newFields.length
		? Object.keys(
				(newFields as Djs.APIEmbedField[]).reduce(
					(acc, f) => {
						acc[f.name] = f.value;
						return acc;
					},
					{} as Record<string, string>
				)
			)
		: undefined;

	// Determine the target user (from cache, otherwise from the message's embedded user)
	if (!userID) {
		const parsedUser2 = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
		const mention2 = parsedUser2["common.user"]; // <@id>
		const idMatch2 = mention2?.match(/<@(?<id>\d+)>/);
		userID = idMatch2?.groups?.id ?? mention2?.replace(/<@|>/g, "");
		const charNameRaw2 = parsedUser2["common.character"];
		userName =
			charNameRaw2 && charNameRaw2.toLowerCase() !== ul("common.noSet").toLowerCase()
				? charNameRaw2
				: undefined;
	}

	await persistUserAndMemory(
		client,
		interaction,
		userID!,
		userName,
		[message.id, message.channelId],
		ul,
		embedsApplied,
		damageNames
	);

	// Reply and logs
	await sendValidationResponses({
		db: client.settings,
		interaction,
		message,
		newFields: newFields as Djs.APIEmbedField[],
		oldFields,
		removed: !(newFields.length > 0),
		ul,
		userID: userID!,
		userName,
	});

	deleteModerationCache(embedKey);
	await interaction.message.delete();
}

export async function cancelDiceAddModeration(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	client: EClient
) {
	const customId = interaction.customId;
	const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.diceAdd.cancel, customId);
	const { userId, url } = getUserId(interaction);
	if (embedKey) deleteModerationCache(embedKey);

	const samePerson = interaction.user.id === userId;
	let content = ul("modals.cancelled", { url });
	if (samePerson) content = ul("modals.cancelled_by_user", { url });
	await interaction.message.delete();
	await reply(interaction, {
		content,
		flags: Djs.MessageFlags.Ephemeral,
	});
	//send a message to the user that the edition has been cancelled
	if (userId && !samePerson) {
		const user = await fetchUser(client, userId);
		if (user) await user.send(content);
	}
}
