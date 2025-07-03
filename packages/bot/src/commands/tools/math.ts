/**
 * Same as calc but without statistics
 */

import { capitalizeBetweenPunct } from "@dicelette/utils";
import type { EClient } from "client";
import { getStatistics } from "database";
import * as Djs from "discord.js";
import { autoCompleteCharacters, calcOptions, getLangFromInteraction } from "utils";
import { autoFocuseSign, autofocusTransform, calculate } from "./calc";
import "discord_ext";

export const math = {
	data: (calcOptions(new Djs.SlashCommandBuilder(), false) as Djs.SlashCommandBuilder)
		.setNames("math.title")
		.setDescriptions("math.description"),
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const filter = autoCompleteCharacters(interaction, client, false) ?? [];
		const sign = autoFocuseSign(interaction);
		if (sign) return await interaction.respond(sign);
		const transform = autofocusTransform(
			interaction,
			getLangFromInteraction(interaction, client)
		);
		if (transform) return await interaction.respond(transform);
		return await interaction.respond(
			filter.map((result) => ({
				name: capitalizeBetweenPunct(result.capitalize()),
				value: result,
			}))
		);
	},
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild || !interaction.channel) return;
		const { options, ul, optionChar } = (await getStatistics(interaction, client)) ?? {};
		if (!ul || !options) return;
		return await calculate(options, ul, interaction, client, undefined, optionChar);
	},
};
