/** biome-ignore-all lint/style/useNamingConvention: bruh */

import * as fs from "node:fs";
import { cmdLn, t } from "@dicelette/localization";
import type { EClient } from "@dicelette/bot-core";
import * as Djs from "discord.js";
import { getLangAndConfig } from "utils";

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
						name_localizations: cmdLn("activities.playing"),
						value: Djs.ActivityType.Playing,
					},
					{
						name: t("activities.streaming"),
						name_localizations: cmdLn("activities.streaming"),
						value: Djs.ActivityType.Streaming,
					},
					{
						name: t("activities.listening"),
						name_localizations: cmdLn("activities.listening"),
						value: Djs.ActivityType.Listening,
					},
					{
						name: t("activities.watching"),
						name_localizations: cmdLn("activities.watching"),
						value: Djs.ActivityType.Watching,
					},
					{
						name: t("activities.competing"),
						name_localizations: cmdLn("activities.competing"),
						value: Djs.ActivityType.Competing,
					},
					{
						name: t("activities.custom"),
						name_localizations: cmdLn("activities.custom"),
						value: Djs.ActivityType.Custom,
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
		//update client status
		client.status.text = text;
		client.status.type = activities;
		//update the file
		if (fs.existsSync(client.statusPath))
			fs.writeFileSync(client.statusPath, JSON.stringify(client.status), "utf-8");
	},
};
