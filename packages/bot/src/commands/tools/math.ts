/**
 * Same as calc but without statistics
 */

import type { EClient } from "@dicelette/bot-core";
import { getStatistics } from "database";
import * as Djs from "discord.js";
import { calcOptions, getLangAndConfig } from "utils";
import { autocompleteCalc, calculate } from "./calc";
import "discord_ext";

export const math = {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		return await autocompleteCalc(interaction, client);
	},
	data: (calcOptions(new Djs.SlashCommandBuilder(), false) as Djs.SlashCommandBuilder)
		.setNames("math.title")
		.setDescriptions("math.description"),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild || !interaction.channel) return;
		let { options, ul, optionChar } =
			(await getStatistics(interaction, client, true)) ?? {};
		if (!ul || !options) {
			ul = getLangAndConfig(client, interaction).ul;
			options = interaction.options as Djs.CommandInteractionOptionResolver;
		}
		return await calculate(options, ul, interaction, client, undefined, optionChar);
	},
};
