import { getInteractionContext as getLangAndConfig } from "@dicelette/helpers";
import { t } from "@dicelette/localization";
import { LINKS } from "@dicelette/types";
import { getOptionsVersion } from "@dicelette/utils";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { GetInfo } from "./get_info";
import "@dicelette/discord_ext";

export const commandHelp = {
	async autocomplete(interaction: Djs.AutocompleteInteraction): Promise<void> {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const subcommand = options.getSubcommand(true);
		if (subcommand !== t("help.changelog.name")) return;
		const focused = options.getFocused(true);
		if (focused.name !== t("help.changelog.version.name")) return;
		const versions = getOptionsVersion();
		const filteredVersions = versions.filter((v) =>
			v.name.toLowerCase().includes(focused.value.toLowerCase())
		);
		await interaction.respond(
			filteredVersions.slice(0, 25).map((v) => ({ name: v.name, value: v.value }))
		);
	},
	data: new Djs.SlashCommandBuilder()
		.setNames("help.name")
		.setIntegrationTypes(
			Djs.ApplicationIntegrationType.GuildInstall,
			Djs.ApplicationIntegrationType.UserInstall
		)
		.setContexts(
			Djs.InteractionContextType.Guild,
			Djs.InteractionContextType.BotDM,
			Djs.InteractionContextType.PrivateChannel
		)
		.setDescriptions("help.description")
		.addSubcommand((sub) =>
			sub.setNames("help.info.name").setDescriptions("help.info.description")
		)
		.addSubcommand((sub) =>
			sub.setNames("help.bug.name").setDescriptions("help.bug.description")
		)
		.addSubcommand((sub) =>
			sub.setNames("help.fr.name").setDescriptions("help.fr.description")
		)
		.addSubcommand((sub) =>
			sub.setNames("help.admin.name").setDescriptions("help.admin.description")
		)
		.addSubcommand((sub) =>
			sub.setNames("register.name").setDescriptions("help.register.description")
		)
		.addSubcommand((sub) =>
			sub
				.setNames("help.changelog.name")
				.setDescriptions("help.changelog.description")
				.addStringOption((sub) =>
					sub
						.setNames("help.changelog.version.name")
						.setDescriptions("help.changelog.version.description")
						.setRequired(false)
						.setAutocomplete(true)
				)
		),

	async execute(
		interaction: Djs.ChatInputCommandInteraction,
		client: EClient
	): Promise<void> {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const subcommand = options.getSubcommand(true);
		const { ul, langToUse } = getLangAndConfig(client, interaction);
		const link = langToUse === "fr" ? LINKS.fr : LINKS.en;
		const getInfo = new GetInfo(interaction, client, ul, link);
		switch (subcommand) {
			case t("help.info.name"): {
				await getInfo.getInfo();
				break;
			}
			case t("help.bug.name"):
				await getInfo.getBugReportLink();
				break;
			case t("help.fr.name"):
				await getInfo.getRequestLink();
				break;
			case t("register.name"): {
				await getInfo.getRegister();
				break;
			}
			case t("help.admin.name"): {
				await getInfo.getAdminDBIDs();
				break;
			}
			case t("help.changelog.name"): {
				await getInfo.getChangelog();
				break;
			}
		}
	},
};
