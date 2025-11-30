import type { StatisticalTemplate } from "@dicelette/core";
import { ln } from "@dicelette/localization";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { Settings, Translation } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	isArrayEqual,
} from "@dicelette/utils";
import * as Djs from "discord.js";
import { Dice } from "features";
import { getEmbeds, reply } from "messages";
import { allowEdit } from "utils";

const botErrorOptions: BotErrorOptions = {
	cause: "STAT_MODALS",
	level: BotErrorLevel.Warning,
};

/**
 * Modal to display the statistics when adding a new user
 * Will display the statistics that are not already set
 * 5 statistics per page
 */
export async function show(
	interaction: Djs.ButtonInteraction,
	template: StatisticalTemplate,
	stats?: string[],
	page = 1,
	moderation = false
) {
	if (!template.statistics) return;
	const ul = ln(interaction.locale as Djs.Locale);
	const isModerator =
		moderation &&
		!interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	const statsWithoutCombinaison =
		Object.keys(template.statistics).filter((stat) => {
			return !template.statistics?.[stat]?.combinaison;
		}) ?? [];
	const nbOfPages =
		Math.ceil(statsWithoutCombinaison.length / 5) >= 1
			? Math.ceil(statsWithoutCombinaison.length / 5) + 1
			: page;
	const modal = new Djs.ModalBuilder()
		.setCustomId(`page${page}`)
		.setTitle(ul("modals.steps", { max: nbOfPages + 1, page }));
	let statToDisplay = statsWithoutCombinaison;
	if (stats && stats.length > 0) {
		statToDisplay = statToDisplay.filter((stat) => !stats.includes(stat.unidecode()));
		if (statToDisplay.length === 0) {
			//remove button
			const button = Dice.buttons(ul, isModerator);
			await reply(interaction, {
				content: ul("modals.alreadySet"),
				flags: Djs.MessageFlags.Ephemeral,
			});
			await interaction.message.edit({ components: [button] });
		}
	}
	const statsToDisplay = statToDisplay.slice(0, 4);
	const statisticsLowerCase = Object.fromEntries(
		Object.entries(template.statistics).map(([key, value]) => [key.standardize(), value])
	);
	const inputs = [];
	for (const stat of statsToDisplay) {
		const cleanedName = stat.unidecode();
		const value = statisticsLowerCase[cleanedName];
		if (value.combinaison) continue;
		let msg = "";
		if (value.min && value.max)
			msg = ul("modals.enterValue.minAndMax", { max: value.max, min: value.min });
		else if (value.min) msg = ul("modals.enterValue.minOnly", { min: value.min });
		else if (value.max) msg = ul("modals.enterValue.maxOnly", { max: value.max });

		const input: Djs.LabelBuilder = new Djs.LabelBuilder()
			.setLabel(stat)
			.setTextInputComponent(
				new Djs.TextInputBuilder()
					.setCustomId(cleanedName)
					.setRequired(true)
					.setStyle(Djs.TextInputStyle.Short)
			);
		if (msg.length) input.setDescription(msg);
		inputs.push(input);
	}
	modal.setLabelComponents(...inputs);
	await interaction.showModal(modal);
}

/**
 * The button that trigger the stats editor
 */
export async function edit(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser))
		await showEditorStats(interaction, ul, db);
}

/**
 * Displays a modal allowing the user to edit their statistics.
 *
 * Retrieves the user's current statistics from the interaction message, formats them for editing, and includes any missing registered statistics with a default value of 0. Presents all statistics in a multiline text input within a modal dialog.
 *
 * @throws {Error} If no statistics embed is found in the interaction message.
 */
async function showEditorStats(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	db: Settings
) {
	const statistics = getEmbeds(interaction.message, "stats");
	if (!statistics) throw new BotError(ul("error.stats.notFound_plural"), botErrorOptions);
	const stats = parseEmbedFields(statistics.toJSON() as Djs.Embed);
	const originalGuildData = db.get(interaction.guild!.id, "templateID.statsName");
	const registeredStats = originalGuildData?.map((stat) => stat.unidecode());
	const userStats = Object.keys(stats).map((stat) => stat.unidecode());
	let statsStrings = "";
	for (const [name, value] of Object.entries(stats)) {
		let stringValue = value;
		if (!registeredStats?.includes(name.unidecode())) continue; //remove stats that are not registered
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
			const realName = originalGuildData?.find((x) => x.unidecode() === stat.unidecode());
			statsStrings += `- ${realName?.capitalize()}${ul("common.space")}: 0\n`;
		}
	}

	const modal = new Djs.ModalBuilder()
		.setCustomId("editStats")
		.setTitle(ul("common.statistics").capitalize());
	/*
	const input =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("allStats")
				.setLabel(ul("modals.edit.stats"))
				.setRequired(true)
				.setStyle(Djs.TextInputStyle.Paragraph)
				.setValue(statsStrings)
		);
	modal.addComponents(input);
	 */
	const input: Djs.LabelBuilder = new Djs.LabelBuilder()
		.setLabel(ul("common.statistics").capitalize())
		.setDescription(ul("modals.edit.stats"))
		.setTextInputComponent(
			new Djs.TextInputBuilder()
				.setCustomId("allStats")
				.setRequired(true)
				.setStyle(Djs.TextInputStyle.Paragraph)
				.setValue(statsStrings)
		);
	modal.setLabelComponents(input);
	await interaction.showModal(modal);
}
