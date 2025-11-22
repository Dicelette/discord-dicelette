import { t } from "@dicelette/localization";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { getLangAndConfig } from "utils";
import {
	createLinksCmdOptions,
	getTemplateValues,
	resetTemplate,
	setTemplate,
} from "./setTemplate";
import * as snippets from "./snippets";

export const userSettings = {
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
								.setNames("userSettings.snippets.create.content.name")
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
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("userSettings.snippets.list.title")
						.setDescriptions("userSettings.snippets.list.description")
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
		}
	},
};

export { setTemplate, getTemplateValues, createLinksCmdOptions };
