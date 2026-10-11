import * as Djs from "discord.js";
import "@dicelette/discord_ext";
import { getInteractionContext as getLangAndConfig } from "@dicelette/helpers";
import { t } from "@dicelette/localization";
import type { EClient } from "client";
import dedent from "dedent";
import { fetchAllCommands } from "./commandId";
export default {
	data: new Djs.SlashCommandBuilder()
		.setNames("help.general.title")
		.setDescriptions("help.general.description")
		.setIntegrationTypes(
			Djs.ApplicationIntegrationType.GuildInstall,
			Djs.ApplicationIntegrationType.UserInstall
		)
		.setContexts(
			Djs.InteractionContextType.Guild,
			Djs.InteractionContextType.BotDM,
			Djs.InteractionContextType.PrivateChannel
		),
	async execute(
		interaction: Djs.ChatInputCommandInteraction,
		client: EClient
	): Promise<void> {
		const { ul } = getLangAndConfig(client, interaction);
		let rollId: string | number = 0;
		let cmdsId: string | number = 0;
		if (interaction.guild) {
			const cmds = await fetchAllCommands(interaction.guild);
			rollId = cmds.findKey((command) => command.name === t("roll.name")) || 0;
			cmdsId = cmds.findKey((command) => command.name === t("help.name")) || 0;
		}
		const msg = ul("help.general.message", { rollId, cmdsId });
		const replySection = [];
		replySection.push(new Djs.TextDisplayBuilder().setContent(dedent(msg)));
		await interaction.botReply({
			components: replySection,
			flags: [Djs.MessageFlags.IsComponentsV2, Djs.MessageFlags.Ephemeral],
		});
	},
};
