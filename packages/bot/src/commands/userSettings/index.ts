import { t } from "@dicelette/localization";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { getLangAndConfig } from "utils";
import { createLinksCmdOptions, getTemplateValues, setTemplate } from "./setTemplate";

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
		}
	},
};

export { setTemplate, getTemplateValues, createLinksCmdOptions };
