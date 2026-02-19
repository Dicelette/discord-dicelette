/** biome-ignore-all lint/style/useNamingConvention: DiscordJS doesn't follow at 100% things */
import { cmdLn, ln } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import { t } from "i18next";

export default {
	data: new Djs.SlashCommandBuilder()
		.setNames("description.name")
		.setDescriptions("description.description")
		.setContexts(Djs.InteractionContextType.Guild)
		.setIntegrationTypes(Djs.ApplicationIntegrationType.GuildInstall)

		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
			option
				.setNames("activities.text.name")
				.setDescriptions("description.text.description")
				.setRequired(true)
				.setMaxLength(400)
		)
		.addStringOption((option) =>
			option
				.setNames("description.options.name")
				.setDescriptions("description.option.description")
				.setRequired(false)
				.addChoices(
					{
						name: "replace",
						value: "replace",
						name_localizations: cmdLn("description.option.replace"),
					},
					{
						name: "append",
						value: "append",
						name_localizations: cmdLn("description.option.append"),
					},
					{
						name: "prepend",
						value: "prepend",
						name_localizations: cmdLn("description.option.prepend"),
					}
				)
		),
	execute: async (interaction: Djs.ChatInputCommandInteraction) => {
		await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const ul = ln(interaction.locale);
		let text = interaction.options
			.getString(t("activities.text.name"), true)
			.replaceAll(/\\n/g, "\n");
		console.log(text);
		try {
			const oldDesc = interaction.client.application?.description ?? "";
			const option = interaction.options.getString(t("description.options.name")) as
				| "replace"
				| "append"
				| "prepend"
				| null;
			const isOk = await verifyDescription(oldDesc, text, ul, interaction);
			if (!isOk) return;
			if (option === "append") {
				text = `${oldDesc}\n${text}`;
			} else if (option === "prepend") {
				text = `${text}\n${oldDesc}`;
			}
			await interaction.client.application.edit({ description: text });
			await interaction.editReply({
				content: "Done!",
			});
		} catch (err) {
			logger.error("Failed to change guild description:", err);
			await interaction.editReply({
				content: t("description.error"),
			});
		}
	},
};

async function verifyDescription(
	text: string,
	toAdd: string,
	ul: Translation,
	interaction: Djs.ChatInputCommandInteraction
) {
	if (text.length + toAdd.length + 1 >= 400) {
		await interaction.editReply({
			content: ul("description.error.tooLong", {
				max: 400,
				current: text.length + toAdd.length,
			}),
		});
		return false;
	}
	return true;
}
