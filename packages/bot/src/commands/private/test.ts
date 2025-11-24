import type { EClient } from "@dicelette/bot-core";
import { roll } from "@dicelette/core";
import * as Djs from "discord.js";

export default {
	data: new Djs.SlashCommandBuilder()
		.setName("test")
		.setDescription("test")
		.setContexts(Djs.InteractionContextType.Guild)
		.setDefaultMemberPermissions(0),
	execute: async (interaction: Djs.ChatInputCommandInteraction, _client: EClient) => {
		const rolled = roll("1d20");
		await interaction.reply(`Rolled: ${rolled?.total}`);
	},
};
