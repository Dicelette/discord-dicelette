import type { EClient } from "client";
import * as Djs from "discord.js";
import {roll} from "@dicelette/core";

export default {
	data: new Djs.SlashCommandBuilder()
		.setName("test")
		.setDescription("test")
		.setContexts(Djs.InteractionContextType.Guild)
		.setDefaultMemberPermissions(0),
	execute: async (interaction: Djs.ChatInputCommandInteraction, client: EClient) => {
		const rolled = roll("1d20")
		await interaction.reply(`Rolled: ${rolled?.total}`);
	},
};
