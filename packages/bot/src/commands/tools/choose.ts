import * as Djs from "discord.js";
import "discord_ext";
import { t } from "@dicelette/localization";
import { shuffle } from "@dicelette/parse_result";
import type { EClient } from "../../client";
import { getLangAndConfig } from "../../utils";

export const choose = {
	data: new Djs.SlashCommandBuilder()
		.setNames("choose.name")
		.setDescription("choose.description")
		.addStringOption((option) =>
			option
				.setNames("choose.list.name")
				.setDescriptions("choose.list.description")
				.setRequired(true)
		)
		.addIntegerOption((option) =>
			option
				.setNames("choose.number.name")
				.setDescriptions("choose.number.description")
				.setRequired(false)
		),

	execute: async (interaction: Djs.ChatInputCommandInteraction, client: EClient) => {
		await command(interaction, client);
	},
};

export const select = {
	data: new Djs.SlashCommandBuilder()
		.setNames("choose.select")
		.setContexts(
			Djs.InteractionContextType.BotDM,
			Djs.InteractionContextType.PrivateChannel
		)
		.setDescription("choose.description")
		.addStringOption((option) =>
			option
				.setNames("choose.list.name")
				.setDescriptions("choose.list.description")
				.setRequired(true)
		)
		.addIntegerOption((option) =>
			option
				.setNames("choose.number.name")
				.setDescriptions("choose.number.description")
				.setRequired(false)
		),
	execute: async (interaction: Djs.ChatInputCommandInteraction, client: EClient) => {
		await command(interaction, client);
	},
};
async function command(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
	const list = interaction.options.getString(t("choose.list.name"), true);
	const nbItemsToSelect = interaction.options.getInteger(t("choose.number.name"), false);
	const { ul } = getLangAndConfig(client, interaction);
	const items = list.split(/[, ;]+/).filter((item) => item.trim().length > 0);
	const selected = shuffle(items, nbItemsToSelect ?? 1);
	await interaction.reply({
		content: ul("choose.result", {
			items: selected.map((x) => `\`${x}\``).join(", "),
		}),
	});
}
