import { evalStatsDice, isNumber, roll } from "@dicelette/core";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { Translation, UserMessageId, UserRegistration } from "@dicelette/types";
import { capitalizeBetweenPunct, logger } from "@dicelette/utils";
import type { EClient } from "client";
import { getUserNameAndChar, registerUser, updateMemory } from "database";
import type { TextChannel } from "discord.js";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	displayOldAndNewStats,
	getEmbeds,
	getEmbedsList,
	removeEmbedsFromList,
	reply,
	sendLogs,
	stripFooter,
} from "messages";
import {
	buildModerationButtons,
	CUSTOM_ID_PREFIX,
	deleteModerationCache,
	editUserButtons,
	fetchChannel,
	fetchUser,
	getMessageWithKeyPart,
	getModerationCache,
	getUserId,
	makeEmbedKey,
	parseEmbedKey,
	parseKeyFromCustomId,
	putModerationCache,
	selectEditMenu,
	selfRegisterAllowance,
	setModerationFooter,
} from "utils";

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
	// 1) Création + validation des embeds
	const values = interaction.fields.getTextInputValue("allDice");
	const { fieldsToAppend, diceEmbed, oldFields, removed } = createAndValidateDiceEmbed(
		values,
		message,
		ul
	);
	// Permission/Modération: basculer en validation par modération si nécessaire
	const { userID, userName } = await getUserNameAndChar(interaction, ul);
	const messageID = [message.id, message.channelId] as UserMessageId;

	if (allowance.moderation && allowance.allowSelfRegister && !isModerator) {
		// Stocker l'embed dans le cache et publier un message pour approbation
		const embedKey = makeEmbedKey(interaction.guild!.id, message.channelId, message.id);
		// Footer de secours: conserve un minimum de métadonnées si le cache disparaît
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
		// Si l'embed est vide (suppression de toutes les macros), afficher un petit message plutôt qu'un embed vide
		if (!fieldsToAppend || fieldsToAppend.length === 0) {
			await interaction.editReply({
				components: [row],
				content: ul("modals.removed.dice"),
			});
		} else {
			await interaction.editReply({ components: [row], embeds: [diceEmbed] });
		}
		return; // ne pas appliquer directement
	}

	// 2) Édit du message d'embeds
	const edited = await editMessageDiceEmbeds(message, ul, diceEmbed, removed);

	// 3) Persistance mémoire + sauvegarde utilisateur
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

	// 4) Envoi des messages de validation (réponse + logs)
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
 * Compare deux libellés en neutralisant accents/variantes.
 */
const COMPARE_UNIDECODE = (a: string, b: string) =>
	a.unidecode().standardize() === b.unidecode().standardize();

// Caches centralisés: voir utils/moderation_cache

/**
 * 1) Création et validation de l'embed de dés à partir de la saisie utilisateur.
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
			if (!roll(dice)) {
				throw new Error(ul("error.invalidDice.withDice", { dice }));
			}
			continue;
		}
		const statsValues = parseStatsString(statsEmbeds);
		try {
			evalStatsDice(dice, statsValues);
		} catch (error) {
			logger.warn(error);
			throw new Error(ul("error.invalidDice.eval", { dice }));
		}
		newEmbedDice.push({ inline: true, name: skill.capitalize(), value: `\`${dice}\`` });
	}

	const oldDice = diceEmbeds.toJSON().fields;
	if (oldDice) {
		for (const field of oldDice) {
			const name = field.name.toLowerCase();
			const newValue = newEmbedDice.find((f) => COMPARE_UNIDECODE(f.name, name));
			if (!newValue) {
				newEmbedDice.push({ inline: true, name: name.capitalize(), value: field.value });
			}
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
 * 2) Édite le message avec les bons embeds (et composants si suppression).
 */
async function editMessageDiceEmbeds(
	message: Djs.Message,
	ul: Translation,
	diceEmbed: Djs.EmbedBuilder,
	removed: boolean
): Promise<{ embeds: Djs.EmbedBuilder[] }> {
	const embedsList = getEmbedsList({ embed: diceEmbed, which: "damage" }, message);
	if (removed) {
		const toAdd = removeEmbedsFromList(embedsList.list, "damage");
		const components = editUserButtons(ul, embedsList.exists.stats, false);
		await message.edit({ components: [components, selectEditMenu(ul)], embeds: toAdd });
		return { embeds: toAdd };
	}
	await message.edit({ embeds: embedsList.list });
	return { embeds: embedsList.list };
}

/**
 * 3) Persistance de la mémoire et sauvegarde de l'utilisateur.
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
 * 4) Envoi des messages de validation (réponse éphémère + logs).
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
		await sendLogs(
			ul("logs.dice.remove", {
				char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
				fiche: message.url,
				user: Djs.userMention(interaction.user.id),
			}),
			interaction.guild as Djs.Guild,
			db
		);
		return;
	}

	await reply(interaction, {
		content: ul("embed.edit.dice"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	const compare = displayOldAndNewStats(oldFields ?? [], newFields);
	const logMessage = ul("logs.dice.edit", {
		char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
		fiche: message.url,
		user: Djs.userMention(interaction.user.id),
	});
	await sendLogs(`${logMessage}\n${compare}`.trim(), interaction.guild as Djs.Guild, db);
}

/**
 * Validation par un modérateur pour les dés (via bouton).
 */
export async function couldBeValidatedDice(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	client: EClient
) {
	// Vérifier droits modération
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
	if (!embedKey) throw new Error(ul("error.embed.notFound"));

	// Tenter le cache (chemin nominal)
	const cached = getModerationCache(embedKey);
	let workingEmbed: Djs.EmbedBuilder | undefined =
		cached && cached.kind === "dice-edit" ? cached.embed : undefined;

	// Fallback si le bot a redémarré et que le cache est vide: utiliser l'embed du message de modération
	if (!workingEmbed) {
		const apiEmbed = interaction.message.embeds[0];
		// Si le message de modération n'a pas d'embed (cas suppression), simuler un embed de dés vide
		if (!apiEmbed) {
			workingEmbed = createDiceEmbed(ul);
		} else {
			// Convertit l'embed du message en EmbedBuilder compatible
			workingEmbed = new Djs.EmbedBuilder(apiEmbed.toJSON() as Djs.APIEmbed);
		}
	}
	if (!workingEmbed) throw new Error(ul("error.embed.notFound"));

	// Récupération du message original via la clé (pas de footer nécessaire)
	const message = await getMessageWithKeyPart(ul, interaction, embedKey);
	// Préparation des champs/flags
	const newFields = workingEmbed.toJSON().fields ?? [];
	const removed = newFields.length === 0;

	// 1) Sauvegarder l'état précédent puis éditer le message
	const oldDamage = getEmbeds(message ?? undefined, "damage");
	const oldFields = oldDamage?.toJSON().fields ?? [];
	workingEmbed = workingEmbed.setFooter(null);
	const edited = await editMessageDiceEmbeds(
		message,
		ul,
		stripFooter(workingEmbed),
		removed
	);

	// 2) Persistance mémoire + user (damageNames à partir des champs du nouvel embed)
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
	// Récupération de l'utilisateur cible depuis l'embed "user"
	const userEmbed = getEmbeds(message ?? undefined, "user");
	if (!userEmbed) throw new Error(ul("error.embed.notFound"));
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

	// 3) Réponses/logs
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

	// 4) Nettoyage: supprimer message de demande et cache (si présent)
	deleteModerationCache(embedKey);
	await interaction.message.delete();
}

/** Annulation d'une demande de validation par modération (bouton). */
export async function cancelDiceModeration(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	client: EClient
) {
	const customId = interaction.customId;
	const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.diceEdit.cancel, customId);
	const { userId, url } = getUserId(interaction);
	if (embedKey) {
		deleteModerationCache(embedKey);
	}
	await interaction.message.delete();
	await reply(interaction, {
		content: ul("modals.cancelled"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	if (userId) {
		const user = await fetchUser(client, userId);
		if (user) await user.send(ul("modals.cancelled", { url }));
	}
}

/**
 * Validation par un modérateur pour un ajout de dés (via bouton).
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
	if (!embedKey) throw new Error(ul("error.embed.notFound"));
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
		// Fallback: utiliser la clé encodée dans le customId pour retrouver le message d'origine
		const apiEmbed = interaction.message.embeds[0];
		if (!apiEmbed) throw new Error(ul("error.embed.notFound"));
		moderationDiceEmbed = new Djs.EmbedBuilder(apiEmbed.toJSON() as Djs.APIEmbed);
		const keyParts = parseEmbedKey(embedKey);
		if (!keyParts) throw new Error(ul("error.embed.notFound"));
		targetChannelId = keyParts.channelId;
		targetMessageId = keyParts.messageId;
	}

	const channel = await fetchChannel(interaction.guild!, targetChannelId!);
	if (!channel || !channel.isTextBased()) throw new Error(ul("error.channel.notFound"));
	const message = await channel.messages.fetch(targetMessageId!);

	// Garder les anciens champs pour logs
	const oldDamage = getEmbeds(message ?? undefined, "damage");
	const oldFields = oldDamage?.toJSON().fields ?? [];

	// Préparer la nouvelle liste d'embeds et les composants attendus (boutons d'édition)
	let embedsApplied: Djs.EmbedBuilder[];
	let hasStats: boolean;
	if (cached) {
		embedsApplied = cached.embeds;
		hasStats = !!getEmbeds(undefined, "stats", cached.embeds);
		// Assainir le footer de l'embed des macros si présent
		const damage = getEmbeds(undefined, "damage", embedsApplied);
		if (damage?.toJSON().footer) {
			const damageTitle = damage.toJSON().title ?? "";
			const sanitized = stripFooter(damage);
			embedsApplied = embedsApplied.map((e) =>
				(e.toJSON().title ?? "") === damageTitle ? sanitized : e
			);
		}
	} else {
		// Fallback: fusionner l'embed de dés avec les embeds existants
		const diceEmbedToApply = stripFooter(moderationDiceEmbed!);
		const edited = getEmbedsList({ embed: diceEmbedToApply, which: "damage" }, message);
		embedsApplied = edited.list;
		hasStats = edited.exists.stats;
	}
	const components = [editUserButtons(ul, hasStats, true), selectEditMenu(ul)];
	await message.edit({ components, embeds: embedsApplied });

	// Persistance mémoire + user
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

	// Déterminer l'utilisateur cible (depuis cache, sinon depuis l'embed user du message)
	if (!userID) {
		const userEmbed2 = getEmbeds(message ?? undefined, "user");
		if (!userEmbed2) throw new Error(ul("error.embed.notFound"));
		const parsedUser2 = parseEmbedFields(userEmbed2.toJSON() as Djs.Embed);
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

	// Réponses/logs
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

	await interaction.message.delete();
	await reply(interaction, {
		content: ul("modals.cancelled"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	//send a message to the user that the edition has been cancelled
	if (userId) {
		const user = await fetchUser(client, userId);
		console.log("Cancelling dice add moderation for user:", userId);
		if (user) await user.send(ul("modals.cancelled", { url }));
	}
}
