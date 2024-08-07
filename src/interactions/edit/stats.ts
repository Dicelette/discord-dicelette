import { allowEdit, createStatsEmbed, getUserNameAndChar } from "@interactions";
import { evalOneCombinaison, FormulaError } from "@dicelette/core";
import type { Settings, Translation } from "@interface";
import {
	displayOldAndNewStats,
	isArrayEqual,
	removeEmojiAccents,
	reply,
	sendLogs,
	title,
} from "@utils";
import { editUserButtons } from "@utils/buttons";
import { getTemplateWithDB } from "@utils/db";
import {
	getEmbeds,
	getEmbedsList,
	parseEmbedFields,
	removeEmbedsFromList,
} from "@utils/parse";
import {
	ActionRowBuilder,
	type APIEmbedField,
	type ButtonInteraction,
	type Embed,
	type Guild,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	type ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
	type User,
	userMention,
} from "discord.js";

/**
 * Validate the stats and edit the embed with the new stats for editing
 * @param interaction {ModalSubmitInteraction}
 * @param ul {Translation}
 */
export async function editStats(
	interaction: ModalSubmitInteraction,
	ul: Translation,
	db: Settings
) {
	if (!interaction.message) return;
	const statsEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "stats");
	if (!statsEmbeds) return;
	const values = interaction.fields.getTextInputValue("allStats");
	const templateStats = await getTemplateWithDB(interaction, db);
	if (!templateStats || !templateStats.statistics) return;
	const valuesAsStats = values.split("\n- ").map((stat) => {
		const [name, value] = stat.split(/ ?: ?/);
		return { name: name.replace("- ", "").trim().toLowerCase(), value };
	});
	//fusion all stats into an object instead of list
	const stats = valuesAsStats.reduce(
		(acc, { name, value }) => {
			acc[name] = value;
			return acc;
		},
		{} as { [name: string]: string }
	);
	//verify value from template
	const template = Object.fromEntries(
		Object.entries(templateStats.statistics).map(([name, value]) => [
			removeEmojiAccents(name),
			value,
		])
	);
	const embedsStatsFields: APIEmbedField[] = [];
	for (const [name, value] of Object.entries(stats)) {
		const stat = template?.[removeEmojiAccents(name)];
		if (
			value.toLowerCase() === "x" ||
			value.trim().length === 0 ||
			embedsStatsFields.find(
				(field) => removeEmojiAccents(field.name) === removeEmojiAccents(name)
			)
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
				name: title(name),
				value: `\`${value}\` = ${combinaison}`,
				inline: true,
			});
			continue;
		}
		if (stat.min && num < stat.min) {
			throw new Error(ul("error.mustBeGreater", { value: name, min: stat.min }));
		} //skip register total + max because leveling can be done here
		embedsStatsFields.push({
			name: title(name),
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
				embedsStatsFields.find(
					(field) => removeEmojiAccents(field.name) === removeEmojiAccents(name)
				)
			) {
				//register the old value
				embedsStatsFields.push({
					name: title(name),
					value: field.value,
					inline: true,
				});
			}
		}
	}
	//remove duplicate
	const fieldsToAppend: APIEmbedField[] = [];
	for (const field of embedsStatsFields) {
		const name = field.name.toLowerCase();
		if (
			fieldsToAppend.find((f) => removeEmojiAccents(f.name) === removeEmojiAccents(name))
		)
			continue;
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
		await reply(interaction, { content: ul("modals.removed.stats"), ephemeral: true });
		await sendLogs(
			ul("logs.stats.removed", {
				user: userMention(interaction.user.id),
				fiche: interaction.message.url,
				char: `${userMention(userID)} ${userName ? `(${userName})` : ""}`,
			}),
			interaction.guild as Guild,
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
	await reply(interaction, { content: ul("embed.edit.stats"), ephemeral: true });
	const compare = displayOldAndNewStats(statsEmbeds.toJSON().fields, fieldsToAppend);
	const logMessage = ul("logs.stats.added", {
		user: userMention(interaction.user.id),
		fiche: interaction.message.url,
		char: `${userMention(userID)} ${userName ? `(${userName})` : ""}`,
	});
	await sendLogs(`${logMessage}\n${compare}`, interaction.guild as Guild, db);
}

/**
 * Show the stats editor
 * @param interaction {ButtonInteraction}
 * @param ul {Translation}
 */
export async function showEditorStats(
	interaction: ButtonInteraction,
	ul: Translation,
	db: Settings
) {
	const statistics = getEmbeds(ul, interaction.message, "stats");
	if (!statistics) throw new Error(ul("error.statNotFound"));
	const stats = parseEmbedFields(statistics.toJSON() as Embed);
	const originalGuildData = db.get(interaction.guild!.id, "templateID.statsName");
	const registeredStats = originalGuildData?.map((stat) => removeEmojiAccents(stat));
	const userStats = Object.keys(stats).map((stat) =>
		removeEmojiAccents(stat.toLowerCase())
	);
	let statsStrings = "";
	for (const [name, value] of Object.entries(stats)) {
		let stringValue = value;
		if (!registeredStats?.includes(removeEmojiAccents(name))) continue; //remove stats that are not registered
		if (value.match(/=/)) {
			const combinaison = value.split("=")?.[0].trim();
			if (combinaison) stringValue = combinaison;
		}
		statsStrings += `- ${name}${ul("common.space")}: ${stringValue}\n`;
	}
	if (
		!isArrayEqual(registeredStats, userStats) &&
		registeredStats &&
		registeredStats.length > userStats.length
	) {
		//check which stats was added
		const diff = registeredStats.filter((x) => !userStats.includes(x));
		for (const stat of diff) {
			const realName = originalGuildData?.find(
				(x) => removeEmojiAccents(x) === removeEmojiAccents(stat)
			);
			statsStrings += `- ${title(realName)}${ul("common.space")}: 0\n`;
		}
	}

	const modal = new ModalBuilder()
		.setCustomId("editStats")
		.setTitle(title(ul("common.statistics")));
	const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("allStats")
			.setLabel(ul("modals.edit.stats"))
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph)
			.setValue(statsStrings)
	);
	modal.addComponents(input);
	await interaction.showModal(modal);
}

/**
 * The button that trigger the stats editor
 * @param interaction {ButtonInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 */
export async function triggerEditStats(
	interaction: ButtonInteraction,
	ul: Translation,
	interactionUser: User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser))
		showEditorStats(interaction, ul, db);
}
