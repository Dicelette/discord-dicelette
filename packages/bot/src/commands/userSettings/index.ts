import { t } from "@dicelette/localization";
import { capitalizeBetweenPunct } from "@dicelette/utils";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { getLangAndConfig } from "utils";
import { getSnippetAutocomplete } from "../roll/snippets";
import {
	createLinksCmdOptions,
	getTemplateValues,
	resetTemplate,
	setTemplate,
} from "./setTemplate";
import * as snippets from "./snippets";

export const userSettings = {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const group = interaction.options.getSubcommandGroup(true);
		const subcommand = interaction.options.getSubcommand(true);
		if (group === t("common.snippets")) {
			if (subcommand === t("userSettings.snippets.delete.title")) {
				const choices = getSnippetAutocomplete(interaction, client);
				await interaction.respond(
					choices.slice(0, 25).map((choice) => ({
						name: capitalizeBetweenPunct(choice.capitalize()),
						value: choice,
					}))
				);
			}
		}
	},
	data: new Djs.SlashCommandBuilder()
		.setNames("userSettings.name")
		.setDescriptions("userSettings.description")
		.addSubcommandGroup((group) =>
			createLinksCmdOptions(
				group
					.setNames("userSettings.createLink.title")
					.setDescriptions("userSettings.createLink.description")
			)
		)
		.addSubcommandGroup((group) =>
			group
				.setNames("common.snippets")
				.setDescriptions("userSettings.snippets.description")
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("userSettings.snippets.create.title")
						.setDescriptions("userSettings.snippets.create.description")
						.addStringOption((option) =>
							option
								.setNames("common.name")
								.setDescriptions("userSettings.snippets.create.name")
								.setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setNames("common.dice")
								.setDescriptions("userSettings.snippets.create.content.description")
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("userSettings.snippets.delete.title")
						.setDescriptions("userSettings.snippets.delete.description")
						.addStringOption((option) =>
							option
								.setNames("common.name")
								.setDescriptions("userSettings.snippets.delete.name")
								.setRequired(true)
								.setAutocomplete(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("userSettings.snippets.list.title")
						.setDescriptions("userSettings.snippets.list.description")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("export.name")
						.setDescriptions("userSettings.snippets.export.description")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("import.name")
						.setDescriptions("userSettings.snippets.import.description")
						.addAttachmentOption((option) =>
							option
								.setNames("userSettings.snippets.import.file.title")
								.setDescriptions("userSettings.snippets.import.file.description")
								.setRequired(true)
						)
				)
		),
	execute: async (interaction: Djs.ChatInputCommandInteraction, client: EClient) => {
		const group = interaction.options.getSubcommandGroup(true);
		const subcommand = interaction.options.getSubcommand(true);
		const { ul } = getLangAndConfig(client, interaction);
		if (group === t("userSettings.createLink.title")) {
			if (subcommand === t("userSettings.createLink.format.name"))
				return await setTemplate(client, interaction);
			if (subcommand === t("userSettings.createLink.display.name"))
				return await getTemplateValues(client, ul, interaction);
			if (subcommand === t("userSettings.createLink.reset.name"))
				return resetTemplate(client, interaction);
		} else if (group === t("common.snippets")) {
			if (subcommand === t("userSettings.snippets.create.title"))
				return await snippets.register(client, interaction);
			if (subcommand === t("userSettings.snippets.delete.title"))
				return await snippets.remove(client, interaction);
			if (subcommand === t("userSettings.snippets.list.title"))
				return await snippets.displayList(client, interaction);
			if (subcommand === t("export.name"))
				return await snippets.exportSnippets(client, interaction);
			if (subcommand === t("import.name"))
				return await snippets.importSnippets(client, interaction);
		}
	},
};

export { setTemplate, getTemplateValues, createLinksCmdOptions };
