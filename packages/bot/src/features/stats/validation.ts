import {
	evalCombinaison,
	evalOneCombinaison,
	FormulaError,
	isNumber,
	type StatisticalTemplate,
} from "@dicelette/core";
import { ln } from "@dicelette/localization";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { DataToFooter, Translation } from "@dicelette/types";
import { logger, TotalExceededError } from "@dicelette/utils";
import type { EClient } from "client";
import { getTemplateByInteraction, getUserNameAndChar, updateMemory } from "database";
import type { TextChannel } from "discord.js";
import * as Djs from "discord.js";
import { Dice } from "features";
import {
	createStatsEmbed,
	displayOldAndNewStats,
	getEmbeds,
	getEmbedsList,
	getStatistiqueFields,
	removeEmbedsFromList,
	reply,
	sendLogs,
} from "messages";
import {
	buildModerationButtons,
	CUSTOM_ID_PREFIX,
	continueCancelButtons,
	deleteModerationCache,
	editUserButtons,
	fetchChannel,
	getModerationCache,
	makeEmbedKey,
	parseEmbedKey,
	parseKeyFromCustomId,
	putModerationCache,
	selfRegisterAllowance,
	setModerationFooter,
} from "utils";
import * as Messages from "../../messages";
import { sendValidationMessage } from "../user";

/**
 * Handles a modal submission to register new user statistics and updates the corresponding Discord message embeds.
 *
 * Updates the user and statistics embeds with the submitted values, evaluates and adds combination statistics if all required fields are present, and modifies message components to reflect the current registration state.
 *
 * @param interaction - The modal submit interaction containing user input.
 * @param template - The statistical template defining expected statistics and combinations.
 * @param page - The page number to display in the embed footer (defaults to 2).
 * @param lang - The language locale for localization (defaults to English GB).
 * @param moderation
 * @param moderation
 */
export async function register(
	interaction: Djs.ModalSubmitInteraction,
	template: StatisticalTemplate,
	page: number | undefined = 2,
	lang: Djs.Locale = Djs.Locale.EnglishGB,
	moderation = false
) {
	if (!interaction.message) return;
	const message = await (interaction.channel as TextChannel).messages.fetch(
		interaction.message.id
	);
	const isModerator = interaction.guild?.members.cache
		.get(interaction.user.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
	const ul = ln(lang);
	const userEmbed = getEmbeds(message, "user");
	if (!userEmbed) return;
	const statsEmbed = getEmbeds(message, "stats");
	const oldStatsTotal = (statsEmbed?.toJSON().fields ?? [])
		.filter((field) => isNumber(field.value.removeBacktick()))
		.reduce((sum, field) => sum + Number.parseInt(field.value.removeBacktick(), 10), 0);
	logger.trace(`Old stats total: ${oldStatsTotal}`);

	let combinaisonFields: Record<string, string> = {};
	let stats: Record<string, number> = {};

	try {
		const result = getStatistiqueFields(interaction, template, ul, oldStatsTotal);
		combinaisonFields = result.combinaisonFields;
		stats = result.stats;
	} catch (error) {
		// Si le total est dépassé et que forceDistrib est activé, reset le modal
		if (error instanceof TotalExceededError && template.forceDistrib) {
			await reply(interaction, {
				content: error.message,
				flags: Djs.MessageFlags.Ephemeral,
			});
			//retour à l'étape précédente
			//change the page to 1
			userEmbed.setFooter({ text: ul("common.page", { nb: 1 }) });
			message.edit({
				embeds: [userEmbed],
				components: [continueCancelButtons(ul)],
			});
			return;
		}
		// Si ce n'est pas une erreur de dépassement ou si forceDistrib n'est pas activé, relancer l'erreur
		throw error;
	}

	//combine all embeds as one
	userEmbed.setFooter({ text: ul("common.page", { nb: page }) });
	//add old fields

	const statEmbeds = statsEmbed ?? createStatsEmbed(ul);
	for (const [stat, value] of Object.entries(stats)) {
		statEmbeds.addFields({
			name: stat.capitalize(),
			value: `\`${value}\``,
			inline: true,
		});
	}
	const statsWithoutCombinaison = template.statistics
		? Object.keys(template.statistics)
				.filter((stat) => !template.statistics![stat].combinaison)
				.map((name) => name.standardize())
		: [];
	const embedObject = statEmbeds.toJSON();
	const fields = embedObject.fields;
	if (!fields) return;
	const parsedFields: Record<string, string> = {};
	for (const field of fields) {
		parsedFields[field.name.standardize()] = field.value.removeBacktick().standardize();
	}

	const embedStats = Object.fromEntries(
		Object.entries(parsedFields).filter(([key]) => statsWithoutCombinaison.includes(key))
	);
	const nbStats = Object.keys(embedStats).length;
	const ilReste = calculateRemainingPoints(template.total, oldStatsTotal, stats);
	if (
		nbStats === statsWithoutCombinaison.length &&
		ilReste &&
		ilReste > 0 &&
		template.forceDistrib
	) {
		await reply(interaction, {
			content: ul("modals.stats.forceDistrib", { reste: ilReste }),
			flags: Djs.MessageFlags.Ephemeral,
		});
		//retour à l'étape précédente
		//change the page to 1
		userEmbed.setFooter({ text: ul("common.page", { nb: 1 }) });

		message.edit({
			embeds: [userEmbed],
			components: [continueCancelButtons(ul)],
		});
		return;
	}
	if (nbStats === statsWithoutCombinaison.length) {
		// noinspection JSUnusedAssignment
		let combinaison: Record<string, number> = {};
		combinaison = evalCombinaison(combinaisonFields, embedStats);
		//add combinaison to the embed
		for (const stat of Object.keys(combinaison)) {
			statEmbeds.addFields({
				name: stat.capitalize(),
				value: `\`${combinaisonFields[stat]}\` = ${combinaison[stat]}`,
				inline: true,
			});
		}

		message.edit({
			embeds: [userEmbed, statEmbeds],
			components: [Dice.buttons(ul, moderation && !isModerator)],
		});
		await reply(interaction, {
			content: ul("modals.added.stats"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const restePoints = ilReste
		? `\n${ul("modals.stats.reste", { reste: ilReste, total: template.total, nbStats: statsWithoutCombinaison.length - nbStats })}`
		: "";

	message.edit({
		embeds: [userEmbed, statEmbeds],
		components: [continueCancelButtons(ul)],
	});
	await reply(interaction, {
		content: `${ul("modals.added.stats")}${restePoints}`,
		flags: Djs.MessageFlags.Ephemeral,
	});
	return;
}

function calculateRemainingPoints(
	total = 0,
	oldTotal = 0,
	stats?: Record<string, number>
) {
	let newTotal = 0;
	if (stats) newTotal = Object.values(stats).reduce((sum, value) => sum + value, 0);
	if (total === 0) return undefined;
	if (oldTotal === 0) {
		return total - newTotal;
	}
	if (oldTotal > 0) return total - (oldTotal + newTotal);

	return undefined;
}

async function getFromModal(
	interaction: Djs.ModalSubmitInteraction,
	client: EClient,
	ul: Translation
) {
	if (!interaction.message) return;
	const message = await (interaction.channel as TextChannel).messages.fetch(
		interaction.message.id
	);
	await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
	const statsEmbeds = getEmbeds(message ?? undefined, "stats");
	if (!statsEmbeds) return;
	return {
		fieldsToAppend: await getFieldsToAppend(ul, interaction, client, statsEmbeds),
		statsEmbeds,
		message,
	};
}

/**
 * Validates and updates user statistics from a modal submission, editing the stats embed in the Discord message.
 *
 * Parses and normalizes user input, checks values against the statistical template, evaluates formulas if present, and enforces minimum constraints. Updates or removes the stats embed as appropriate, sends ephemeral confirmation to the user, and logs the changes.
 *
 * @param interaction - The modal submit interaction containing the new stats input.
 * @param ul - Localization function for translating messages.
 * @param client - The extended Discord client instance.
 *
 * @param data
 * @param userData
 * @throws {FormulaError} If a stat value contains an invalid formula.
 * @throws {Error} If a stat name is not found in the template or if a value is below the minimum allowed.
 */
export async function validateEdit(
	interaction: Djs.ModalSubmitInteraction | Djs.ButtonInteraction,
	ul: Translation,
	client: EClient,
	data?: {
		fieldsToAppend?: Djs.APIEmbedField[];
		statsEmbeds: Djs.EmbedBuilder;
		message: Djs.Message;
	},
	userData?: {
		userID: string;
		userName?: string;
	}
) {
	const db = client.settings;
	const characters = client.characters;
	if (interaction.isModalSubmit()) data = await getFromModal(interaction, client, ul);

	if (!data) return;
	const { fieldsToAppend, statsEmbeds, message } = data;
	if (!fieldsToAppend) return;
	const newEmbedStats = createStatsEmbed(ul).addFields(fieldsToAppend);
	if (!userData) userData = await getUserNameAndChar(interaction, ul);
	const { userID, userName } = userData;
	if (!fieldsToAppend || fieldsToAppend.length === 0) {
		//stats was removed
		const { list, exists } = getEmbedsList(
			{ which: "stats", embed: newEmbedStats },
			message
		);
		const toAdd = removeEmbedsFromList(list, "stats");
		const components = editUserButtons(ul, false, exists.damage);
		await message.edit({ embeds: toAdd, components: [components] });
		await reply(interaction, {
			content: ul("modals.removed.stats"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		await sendLogs(
			ul("logs.stats.removed", {
				user: Djs.userMention(interaction.user.id),
				fiche: message.url,
				char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
			}),
			interaction.guild as Djs.Guild,
			db
		);
	}
	//get the other embeds
	const { list } = getEmbedsList({ which: "stats", embed: newEmbedStats }, message);
	await message.edit({ embeds: list });

	await reply(interaction, {
		content: ul("embed.edit.stats"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	const compare = displayOldAndNewStats(statsEmbeds.toJSON().fields, fieldsToAppend);
	const logMessage = ul("logs.stats.added", {
		user: Djs.userMention(interaction.user.id),
		fiche: message.url,
		char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
	});
	//send logs
	await sendLogs(`${logMessage}\n${compare}`, interaction.guild as Djs.Guild, db);
	//update memory
	await updateMemory(characters, interaction.guild!.id, userID, ul, {
		embeds: list,
	});
}

async function getFieldsToAppend(
	ul: Translation,
	interaction: Djs.ModalSubmitInteraction,
	client: EClient,
	statsEmbeds: Djs.EmbedBuilder
) {
	const values = interaction.fields.getTextInputValue("allStats");
	const templateStats = await getTemplateByInteraction(interaction, client);
	if (!templateStats || !templateStats.statistics) return;
	const valuesAsStats = values.split("\n- ").map((stat) => {
		const [name, value] = stat.split(/ ?: ?/);
		return { name: name.replace(/^- /, "").trim().toLowerCase(), value };
	});
	//fusion all stats into an object instead of list
	const stats = valuesAsStats.reduce(
		(acc, { name, value }) => {
			acc[name] = value;
			return acc;
		},
		{} as Record<string, string>
	);
	//verify value from template
	const template = Object.fromEntries(
		Object.entries(templateStats.statistics).map(([name, value]) => [
			name.unidecode(),
			value,
		])
	);
	const embedsStatsFields: Djs.APIEmbedField[] = [];
	for (const [name, value] of Object.entries(stats)) {
		const stat = template?.[name.unidecode()];
		if (
			value.toLowerCase() === "x" ||
			value.trim().length === 0 ||
			embedsStatsFields.find((field) => field.name.unidecode() === name.unidecode())
		)
			continue;
		if (!stat) throw new Error(ul("error.stats.notFound", { value: name }));

		if (!isNumber(value)) {
			//it's a combinaison OR an error
			//we need to get the result of the combinaison

			const combinaison = Number.parseInt(evalOneCombinaison(value, stats), 10);
			if (!isNumber(combinaison)) {
				throw new FormulaError(value);
			}
			embedsStatsFields.push({
				name: name.capitalize(),
				value: `\`${value}\` = ${combinaison}`,
				inline: true,
			});
			continue;
		}
		const num = Number.parseInt(value, 10);
		if (stat.min && num < stat.min) {
			throw new Error(ul("error.mustBeGreater", { value: name, min: stat.min }));
		} //skip register total + max because leveling can be done here
		embedsStatsFields.push({
			name: name.capitalize(),
			value: `\`${num}\``,
			inline: true,
		});
	}
	//verify if stats are all set from the old embed
	const oldStats = statsEmbeds.toJSON().fields;
	if (oldStats) {
		for (const field of oldStats) {
			const name = field.name.toLowerCase();
			if (
				field.value !== "0" &&
				field.value.toLowerCase() !== "x" &&
				field.value.trim().length > 0 &&
				embedsStatsFields.find((field) => field.name.unidecode() === name.unidecode())
			) {
				//register the old value
				embedsStatsFields.push({
					name: name.capitalize(),
					value: field.value,
					inline: true,
				});
			}
		}
	}
	//remove duplicate
	const fieldsToAppend: Djs.APIEmbedField[] = [];
	for (const field of embedsStatsFields) {
		const name = field.name.toLowerCase();
		if (fieldsToAppend.find((f) => f.name.unidecode() === name.unidecode())) continue;
		fieldsToAppend.push(field);
	}
	return fieldsToAppend;
}

export async function validateByModeration(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	client: EClient
) {
	//only used when the self-registration is enabled.
	//after the modals the user can't validate the stats by himself and the moderation team should push the button "validate"
	//we should display a little message in the channel to set the edit and add a button to validate
	const allowance = selfRegisterAllowance(
		client.settings.get(interaction.guild!.id, "allowSelfRegister")
	);
	const moderator = interaction.guild?.members.cache
		.get(interaction.user.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (!allowance.allowSelfRegister || moderator || !allowance.moderation) {
		//self registration allow to "prevent" user to validate their own stats, so we should directly edit in the case of the self registration is not allowed
		await validateEdit(interaction, ul, client);
		return;
	}
	if (!interaction.message) return;
	const message = await (interaction.channel as TextChannel).messages.fetch(
		interaction.message.id
	);
	const statsEmbeds = getEmbeds(message ?? undefined, "stats");
	if (!statsEmbeds) return;
	const fieldsToAppend = await getFieldsToAppend(ul, interaction, client, statsEmbeds);
	if (!fieldsToAppend) return;
	const { userID, userName } = await getUserNameAndChar(interaction, ul);
	const compare = displayOldAndNewStats(statsEmbeds.toJSON().fields, fieldsToAppend);
	const logMessage = ul("logs.stats.added", {
		user: Djs.userMention(interaction.user.id),
		fiche: message.url,
		char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
	});
	//send logs
	await sendLogs(
		`${logMessage}\n${compare}`,
		interaction.guild as Djs.Guild,
		client.settings
	);
	//add a new message embed in the channel with the new stats for the future validation
	const newEmbedStats = createStatsEmbed(ul).addFields(fieldsToAppend);
	const user = await getUserNameAndChar(interaction, ul);
	// Footer de secours pour la demande de validation
	setModerationFooter(newEmbedStats, {
		userID: user.userID,
		userName: user.userName,
		channelId: interaction.message.channelId,
		messageId: interaction.message.id,
	});

	const embedKey = makeEmbedKey(
		interaction.guild!.id,
		interaction.message.channelId,
		interaction.message.id
	);
	putModerationCache(embedKey, {
		kind: "stats-edit",
		embed: newEmbedStats,
		meta: {
			userID: user.userID,
			userName: user.userName,
			channelId: interaction.message.channelId,
			messageId: interaction.message.id,
		},
	});

	const row = buildModerationButtons("stats-edit", ul, embedKey);
	await interaction.reply({ embeds: [newEmbedStats], components: [row] });
}

export async function couldBeValidated(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	client: EClient,
	interactionUser: Djs.User
) {
	//tricky part as my brain is not working well
	//It's the validation & push button
	//aka like the first validation in the registration user
	//Only moderation team can validate so we should check if the user is a moderator
	const moderator = interaction.guild?.members.cache
		.get(interaction.user.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (!moderator) {
		let notAllowedMsg = ul("modals.noPermission");
		notAllowedMsg += `\n${ul("modals.onlyModerator")}`;
		await sendValidationMessage(interaction, interactionUser, ul, client);
		await Messages.reply(interaction, {
			content: notAllowedMsg,
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const customId = interaction.customId;
	const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.stats.validate, customId);

	if (!embedKey) {
		// rétrocompatibilité: ancien flux basé sur footer
		const replyIds = interaction.message.embeds[0]?.footer?.text;
		if (!replyIds) throw new Error(ul("error.embed.notFound"));
		const data: DataToFooter = JSON.parse(replyIds);
		const { channelId, messageId } = data;
		const userData = { userID: data.userID, userName: data.userName };
		logger.trace("Data from footer:", channelId, messageId);
		if (!channelId || !messageId) throw new Error(ul("error.embed.notFound"));
		const channel = await fetchChannel(interaction.guild!, channelId);
		if (!channel || !channel.isTextBased()) throw new Error(ul("error.channel.notFound"));

		const message = await channel.messages.fetch(messageId);
		const oldStatsEmbed =
			getEmbeds(message ?? undefined, "stats") ?? createStatsEmbed(ul);
		const fieldsToAppend = interaction.message.embeds[0]?.toJSON().fields;
		if (!fieldsToAppend || !message) throw new Error(ul("error.embed.notFound"));
		await validateEdit(
			interaction,
			ul,
			client,
			{ fieldsToAppend, statsEmbeds: oldStatsEmbed, message },
			userData
		);
		await interaction.message.delete();
		return;
	}

	const cached = getModerationCache(embedKey);
	let embed = cached && cached.kind === "stats-edit" ? cached.embed : undefined;

	// Fallback: si cache manquant après redémarrage, reconstruire depuis l'embed du message de modération
	if (!embed) {
		const apiEmbed = interaction.message.embeds[0];
		if (!apiEmbed) throw new Error(ul("error.embed.notFound"));
		embed = new Djs.EmbedBuilder(apiEmbed.toJSON() as Djs.APIEmbed);
	}
	if (!embed) throw new Error(ul("error.embed.notFound"));

	const keyParts = parseEmbedKey(embedKey);
	if (!keyParts) throw new Error(ul("error.embed.notFound"));
	const channel = await fetchChannel(interaction.guild!, keyParts.channelId);
	if (!channel || !channel.isTextBased()) throw new Error(ul("error.channel.notFound"));
	const message = await channel.messages.fetch(keyParts.messageId);
	const oldStatsEmbed = getEmbeds(message ?? undefined, "stats") ?? createStatsEmbed(ul);
	const fieldsToAppend = embed.toJSON().fields;
	if (!fieldsToAppend || !message) throw new Error(ul("error.embed.notFound"));
	// Extraire l'utilisateur cible depuis le message d'origine
	const userEmbed = getEmbeds(message ?? undefined, "user");
	if (!userEmbed) throw new Error(ul("error.embed.notFound"));
	const parsedFields = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
	const mention = parsedFields["common.user"]; // <@id>
	const match = mention?.match(/<@(?<id>\d+)>/);
	const ownerId = match?.groups?.id ?? mention?.replace(/<@|>/g, "");
	const charNameRaw = parsedFields["common.character"];
	const ownerName =
		charNameRaw && charNameRaw.toLowerCase() !== ul("common.noSet").toLowerCase()
			? charNameRaw
			: undefined;
	await validateEdit(
		interaction,
		ul,
		client,
		{ fieldsToAppend, statsEmbeds: oldStatsEmbed, message },
		ownerId ? { userID: ownerId, userName: ownerName } : undefined
	);
	deleteModerationCache(embedKey);
	await interaction.message.delete();
}

export async function cancelStatsModeration(
	interaction: Djs.ButtonInteraction,
	ul: Translation
) {
	const customId = interaction.customId;
	const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.stats.cancel, customId);
	if (embedKey) deleteModerationCache(embedKey);
	await interaction.message.delete();
	await reply(interaction, {
		content: ul("common.cancel"),
		flags: Djs.MessageFlags.Ephemeral,
	});
}
