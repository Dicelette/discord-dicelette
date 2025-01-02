import {
	FormulaError,
	type StatisticalTemplate,
	evalCombinaison,
	evalOneCombinaison,
} from "@dicelette/core";
import { ln } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import type { EClient } from "client";
import { getTemplateWithDB, getUserNameAndChar, updateMemory } from "database";
import * as Djs from "discord.js";
import { registerDmgButton } from "features";
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
import { continueCancelButtons, editUserButtons } from "utils";

/**
 * Embed to display the statistics when adding a new user
 * @param interaction {Djs.ModalSubmitInteraction}
 * @param template {StatisticalTemplate}
 * @param page {number=2}
 * @param lang
 */
export async function registerStatistics(
	interaction: Djs.ModalSubmitInteraction,
	template: StatisticalTemplate,
	page: number | undefined = 2,
	lang: Djs.Locale = Djs.Locale.EnglishGB
) {
	if (!interaction.message) return;
	const ul = ln(lang);
	const userEmbed = getEmbeds(ul, interaction.message, "user");
	if (!userEmbed) return;
	const statsEmbed = getEmbeds(ul, interaction.message, "stats");
	const { combinaisonFields, stats } = getStatistiqueFields(interaction, template, ul);
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
	if (Object.keys(embedStats).length === statsWithoutCombinaison.length) {
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

		await interaction.message.edit({
			embeds: [userEmbed, statEmbeds],
			components: [registerDmgButton(ul)],
		});
		await reply(interaction, {
			content: ul("modals.added.stats"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	await interaction.message.edit({
		embeds: [userEmbed, statEmbeds],
		components: [continueCancelButtons(ul)],
	});
	await reply(interaction, {
		content: ul("modals.added.stats"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	return;
}

/**
 * Validate the stats and edit the embed with the new stats for editing
 * @param interaction {Djs.ModalSubmitInteraction}
 * @param ul {Translation}
 * @param client
 */
export async function editStats(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	client: EClient
) {
	const db = client.settings;
	const characters = client.characters;
	if (!interaction.message) return;
	const statsEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "stats");
	if (!statsEmbeds) return;
	const values = interaction.fields.getTextInputValue("allStats");
	const templateStats = await getTemplateWithDB(interaction, db);
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
		if (!stat) {
			throw new Error(ul("error.statNotFound", { value: name }));
		}
		const num = Number.parseInt(value, 10);
		if (Number.isNaN(num)) {
			//it's a combinaison OR an error
			//we need to get the result of the combinaison
			const combinaison = Number.parseInt(evalOneCombinaison(value, stats), 10);
			if (Number.isNaN(combinaison)) {
				throw new FormulaError(value);
			}
			embedsStatsFields.push({
				name: name.capitalize(),
				value: `\`${value}\` = ${combinaison}`,
				inline: true,
			});
			continue;
		}
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
	const newEmbedStats = createStatsEmbed(ul).addFields(fieldsToAppend);
	const { userID, userName } = await getUserNameAndChar(interaction, ul);
	if (!fieldsToAppend || fieldsToAppend.length === 0) {
		//stats was removed
		const { list, exists } = getEmbedsList(
			ul,
			{ which: "stats", embed: newEmbedStats },
			interaction.message
		);
		const toAdd = removeEmbedsFromList(list, "stats");
		const components = editUserButtons(ul, false, exists.damage);
		await interaction.message.edit({ embeds: toAdd, components: [components] });
		await reply(interaction, {
			content: ul("modals.removed.stats"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		await sendLogs(
			ul("logs.stats.removed", {
				user: Djs.userMention(interaction.user.id),
				fiche: interaction.message.url,
				char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
			}),
			interaction.guild as Djs.Guild,
			db
		);
	}
	//get the other embeds
	const { list } = getEmbedsList(
		ul,
		{ which: "stats", embed: newEmbedStats },
		interaction.message
	);
	await interaction.message.edit({ embeds: list });
	await updateMemory(characters, interaction.guild!.id, userID, ul, {
		embeds: list,
	});
	await reply(interaction, {
		content: ul("embed.edit.stats"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	const compare = displayOldAndNewStats(statsEmbeds.toJSON().fields, fieldsToAppend);
	const logMessage = ul("logs.stats.added", {
		user: Djs.userMention(interaction.user.id),
		fiche: interaction.message.url,
		char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
	});
	//update the characters in the memory ;
	await sendLogs(`${logMessage}\n${compare}`, interaction.guild as Djs.Guild, db);
}
