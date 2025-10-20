/** biome-ignore-all lint/style/useNamingConvention: bruh */
import { cmdLn, t } from "@dicelette/localization";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { getLangAndConfig } from "../../utils";

export default {
	data: new Djs.SlashCommandBuilder()
		.setNames("activities.name")
		.setDescriptions("activities.description")
		.setContexts(Djs.InteractionContextType.Guild)
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
			option
				.setNames("activities.text.name")
				.setDescriptions("activities.text.description")
				.setRequired(true)
		)
		.addNumberOption((option) =>
			option
				.setNames("activities.type.name")
				.setDescriptions("activities.type.description")
				.setChoices(
					{
						name: t("activities.playing"),
						value: Djs.ActivityType.Playing,
						name_localizations: cmdLn("activities.playing"),
					},
					{
						name: t("activities.streaming"),
						value: Djs.ActivityType.Streaming,
						name_localizations: cmdLn("activities.streaming"),
					},
					{
						name: t("activities.listening"),
						value: Djs.ActivityType.Listening,
						name_localizations: cmdLn("activities.listening"),
					},
					{
						name: t("activities.watching"),
						value: Djs.ActivityType.Watching,
						name_localizations: cmdLn("activities.watching"),
					},
					{
						name: t("activities.competing"),
						value: Djs.ActivityType.Competing,
						name_localizations: cmdLn("activities.competing"),
					},
					{
						name: t("activities.custom"),
						value: Djs.ActivityType.Custom,
						name_localizations: cmdLn("activities.custom"),
					}
				)
		),
	execute: async (interaction: Djs.ChatInputCommandInteraction, client: EClient) => {
		const activities =
			interaction.options.getNumber(t("activities.type.name")) || undefined;
		const text = interaction.options.getString(t("activities.text.name"), true);

		client.user!.setActivity(text, { type: activities });

		const { ul } = getLangAndConfig(client, interaction);

		await interaction.reply({
			content: ul("activities.set"),
		});
	},
};
