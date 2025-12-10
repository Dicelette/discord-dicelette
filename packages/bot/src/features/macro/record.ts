import {
	addAutoRole,
	buildModerationButtons,
	getInteractionContext as getLangAndConfig,
	makeEmbedKey,
	putModerationCache,
	setModerationFooter,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { evalStatsDice } from "@dicelette/core";
import { findln } from "@dicelette/localization";
import type { Settings, Translation, UserMessageId } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	capitalizeBetweenPunct,
	NoEmbed,
	profiler,
} from "@dicelette/utils";
import {
	getTemplateByInteraction,
	getUserByEmbed,
	getUserNameAndChar,
	registerUser,
	updateMemory,
} from "database";
import type { EmbedBuilder } from "discord.js";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	displayOldAndNewStats,
	embedError,
	ensureEmbed,
	getEmbeds,
	reply,
	sendLogs,
	updateUserEmbedThumbnail,
} from "messages";
import { editUserButtons, selectEditMenu, selfRegisterAllowance } from "utils";

const botErrorOptions: BotErrorOptions = {
	cause: "DICE_REGISTER",
	level: BotErrorLevel.Warning,
};
/**
 * Handles a modal submit interaction to register new skill damage dice for a user.
 *
 * Allows the operation only if the interacting user is the owner referenced in the embed or has moderator permissions.
 * Replies with an error if the required template is not found or if the user lacks permission.
 */
export async function store(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	client: EClient
) {
	profiler.startProfiler();
	if (!(await getTemplateByInteraction(interaction, client))) {
		await reply(interaction, {
			embeds: [
				embedError(ul("error.template.notFound", { guildId: interaction.guildId }), ul),
			],
		});
		return;
	}
	const embed = ensureEmbed(interaction.message ?? undefined);
	const user =
		embed.fields
			.find((field) => findln(field.name) === "common.user")
			?.value.replace("<@", "")
			.replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		await registerDamageDice(interaction, client, interaction.customId.includes("first"));
	else
		await reply(interaction, {
			content: ul("modals.noPermission"),
			flags: Djs.MessageFlags.Ephemeral,
		});
	profiler.stopProfiler();
}

/**
 * Button when registering the user, adding the "add dice" button
 */
export function buttons(
	ul: Translation,
	markAsValidated = false,
	moderationSent = false
) {
	const validateButton = new Djs.ButtonBuilder()
		.setCustomId("validate")
		.setLabel(ul("button.validate"))
		.setStyle(Djs.ButtonStyle.Success);
	if (markAsValidated) {
		validateButton
			.setLabel(ul("button.confirm"))
			.setCustomId("mark_as_valid")
			.setStyle(Djs.ButtonStyle.Primary)
			.setEmoji("📤");
	}
	const cancelButton = new Djs.ButtonBuilder()
		.setCustomId(moderationSent ? "moderation_refuse" : "cancel")
		.setLabel(moderationSent ? ul("button.refuse") : ul("common.cancel"))
		.setStyle(Djs.ButtonStyle.Danger);
	let cancelBut: Djs.ButtonBuilder | null = null;
	if (moderationSent) {
		//add a new button
		cancelBut = new Djs.ButtonBuilder()
			.setCustomId("cancel_by_user")
			.setLabel(ul("common.cancel"))
			.setStyle(Djs.ButtonStyle.Danger);
	}
	const registerDmgButton = new Djs.ButtonBuilder()
		.setCustomId("add_dice_first")
		.setLabel(ul("button.dice"))
		.setStyle(Djs.ButtonStyle.Primary);
	const actionRow = [registerDmgButton, validateButton, cancelButton];
	if (cancelBut) actionRow.push(cancelBut);
	return new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(actionRow);
}

/**
 * Registers a new skill damage dice from modal input, updating the corresponding embed and database entry.
 *
 * Handles both initial dice registration for a user and subsequent additions or edits. Updates the embed with the new dice, evaluates dice values using user stats, enforces a maximum of 25 dice, manages user roles, and updates the database and in-memory cache as needed.
 *
 * @param {Djs.ModalSubmitInteraction} interaction
 * @param {EClient} client
 * @param {boolean|undefined} first - If true, indicates this is the initial dice registration for the user; otherwise, a new dice is being added to an existing user.
 *
 * @throws {Error} If the interaction is missing a guild or message, or if the user cannot be found in the embed.
 */
async function registerDamageDice(
	interaction: Djs.ModalSubmitInteraction,
	client: EClient,
	first?: boolean
) {
	profiler.startProfiler();
	const db = client.settings;
	const { ul } = getLangAndConfig(client, interaction);
	const name = interaction.fields.getTextInputValue("damageName");
	let value = interaction.fields.getTextInputValue("damageValue");
	if (!interaction.guild) throw new BotError(ul("error.guild.empty"), botErrorOptions);
	if (!interaction.message) throw new BotError(ul("error.noMessage"), botErrorOptions);

	if (name.includes(":")) throw new BotError(ul("error.colon"), botErrorOptions);
	const oldDiceEmbeds = getEmbeds(interaction.message ?? undefined, "damage")?.toJSON();
	const diceEmbed = oldDiceEmbeds
		? new Djs.EmbedBuilder(oldDiceEmbeds)
		: createDiceEmbed(ul);
	if (oldDiceEmbeds?.fields)
		for (const field of oldDiceEmbeds.fields) {
			const newField = {
				inline: field.inline,
				name: capitalizeBetweenPunct(field.name),
				value: field.value,
			};
			//add fields only if not already in the diceEmbed
			if (
				diceEmbed
					.toJSON()
					.fields?.findIndex((f) => f.name.standardize() === field.name.standardize()) ===
				-1
			) {
				diceEmbed.addFields(newField);
			}
		}
	const user = getUserByEmbed({ message: interaction.message }, first);
	if (!user) throw new BotError(ul("error.user.notFound"), botErrorOptions); //mean that there is no embed
	value = evalStatsDice(value, user.stats);

	if (!findDuplicate(diceEmbed, name) || !diceEmbed.toJSON().fields) {
		diceEmbed.addFields({
			inline: true,
			name: capitalizeBetweenPunct(name),
			value: `\`${value}\``,
		});
	} else {
		const allFieldWithoutDuplicate = diceEmbed
			.toJSON()
			?.fields?.filter((field) => field.name.standardize() !== name.standardize());
		if (allFieldWithoutDuplicate) {
			diceEmbed.setFields([
				...allFieldWithoutDuplicate,
				{
					inline: true,
					name: capitalizeBetweenPunct(name),
					value: `\`${value}\``,
				},
			]);
		}
	}

	const damageName = diceEmbed.toJSON().fields?.reduce(
		(acc, field) => {
			acc[field.name] = field.value.removeBacktick();
			return acc;
		},
		{} as Record<string, string>
	);
	if (damageName && Object.keys(damageName).length > 25) {
		await reply(interaction, {
			content: ul("modals.dice.max"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const { userID, userName } = await getUserNameAndChar(interaction, ul, first);
	await addAutoRole(
		interaction,
		userID,
		!!damageName && Object.keys(damageName).length > 0,
		false,
		db
	);
	let allEmbeds: Djs.EmbedBuilder[] = [];
	let components: (
		| Djs.ActionRowBuilder<Djs.ButtonBuilder>
		| Djs.ActionRowBuilder<Djs.StringSelectMenuBuilder>
	)[] = [];
	const userEmbed = getEmbeds(interaction.message ?? undefined, "user");
	const statsEmbed = getEmbeds(interaction.message ?? undefined, "stats");
	if (!userEmbed) throw new NoEmbed();
	allEmbeds = [userEmbed];
	if (statsEmbed) allEmbeds.push(statsEmbed);
	allEmbeds.push(diceEmbed);
	const compare = first
		? undefined
		: displayOldAndNewStats(oldDiceEmbeds?.fields, diceEmbed.toJSON().fields);
	if (!first) {
		const templateEmbed = getEmbeds(interaction.message ?? undefined, "template");
		if (templateEmbed) allEmbeds.push(templateEmbed);
		components = [editUserButtons(ul, !!statsEmbed, true), selectEditMenu(ul)];
		// Moderation branching to add dice
		const isModerator = interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		const allowance = selfRegisterAllowance(
			db.get(interaction.guild!.id, "allowSelfRegister")
		);
		if (allowance.moderation && allowance.allowSelfRegister && !isModerator) {
			const embedKey = makeEmbedKey(
				interaction.guild!.id,
				interaction.message.channelId,
				interaction.message.id
			);
			// Footer for restart when needed
			setModerationFooter(diceEmbed, {
				channelId: interaction.message.channelId,
				messageId: interaction.message.id,
				userID,
				userName,
			});
			putModerationCache(embedKey, {
				embeds: allEmbeds,
				kind: "dice-add",
				meta: {
					channelId: interaction.message.channelId,
					messageId: interaction.message.id,
					userID,
					userName,
				},
			});

			const row = buildModerationButtons("dice-add", ul, embedKey);
			await reply(interaction, { components: [row], embeds: [diceEmbed] });
			return; // do not apply changes directly
		}
		const userRegister: {
			userID: string;
			charName: string | undefined;
			damage: string[] | undefined;
			msgId: UserMessageId;
		} = {
			charName: userName,
			damage: damageName ? Object.keys(damageName) : undefined,
			msgId: [interaction.message.id, interaction.message.channel.id],
			userID,
		};
		await registerUser(userRegister, interaction, db, false);
		await updateMemory(client.characters, interaction.guild.id, userID, ul, {
			embeds: allEmbeds,
		});
	} else {
		const isModerator = interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		const selfRegister = selfRegisterAllowance(
			db.get(interaction.guild!.id, "allowSelfRegister")
		).moderation;
		components = [buttons(ul, selfRegister && !isModerator)];
	}

	await edit(
		db,
		interaction,
		ul,
		allEmbeds,
		components,
		userID,
		userName,
		compare,
		first
	);
	profiler.stopProfiler();
}

async function edit(
	db: Settings,
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	allEmbeds: Djs.EmbedBuilder[],
	components: (
		| Djs.ActionRowBuilder<Djs.ButtonBuilder>
		| Djs.ActionRowBuilder<Djs.StringSelectMenuBuilder>
	)[],
	userID: string,
	userName?: string,
	compare?: { stats: string; removed: number; added: number; changed: number },
	first?: boolean
) {
	if (interaction.message) {
		const { files, userDataEmbed } = await updateUserEmbedThumbnail(
			interaction.message,
			allEmbeds[0],
			ul
		);
		allEmbeds[0] = userDataEmbed;
		await interaction?.message?.edit({ components, embeds: allEmbeds, files });
	}
	await reply(interaction, {
		content: ul("modals.added.dice"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	if (first) return;
	if (!compare)
		return await sendLogs(
			ul("logs.dice.add", {
				char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
				count: 1,
				fiche: interaction.message?.url ?? "no url",
				user: Djs.userMention(interaction.user.id),
			}),
			interaction.guild as Djs.Guild,
			db
		);
	const msg = ul("logs.dice.add", {
		char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
		count: compare.added,
		fiche: interaction.message?.url ?? "no url",
		user: Djs.userMention(interaction.user.id),
	});
	return await sendLogs(`${msg}\n${compare.stats}`, interaction.guild as Djs.Guild, db);
}

export function findDuplicate(diceEmbed: EmbedBuilder, name: string) {
	if (!diceEmbed.toJSON().fields) return false;
	return (
		diceEmbed
			.toJSON()
			.fields?.findIndex((f) => f.name.standardize() === name.standardize()) !== -1
	);
}
