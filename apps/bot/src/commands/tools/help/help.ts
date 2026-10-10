import * as Djs from "discord.js";
import "@dicelette/discord_ext";
import { getInteractionContext as getLangAndConfig } from "@dicelette/helpers";
import type { EClient } from "client";
import dedent from "dedent";
import { fetchAllCommands } from "./commandId";
export default {
	data: new Djs.SlashCommandBuilder()
		.setNames("help.general.title")
		.setDescriptions("help.general.description"),
	async execute(
		interaction: Djs.ChatInputCommandInteraction,
		client: EClient
	): Promise<void> {
		const { ul } = getLangAndConfig(client, interaction);
		let rollId = "";
		if (interaction.guild) {
			const cmds = await fetchAllCommands(interaction.guild);
			rollId = cmds.findKey((command) => command.name === "roll") || "";
		}
		const msg = ul("help.general.message", { rollId });
		const replySection = [];
		replySection.push(new Djs.TextDisplayBuilder().setContent(dedent(msg)));
		await interaction.botReply({
			components: replySection,
			flags: [Djs.MessageFlags.IsComponentsV2, Djs.MessageFlags.Ephemeral],
		});
	},
};
