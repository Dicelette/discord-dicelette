/**
 * Same as calc but without statistics
 */

import { capitalizeBetweenPunct } from "@dicelette/utils";
import type { EClient } from "client";
import { getStatistics } from "database";
import * as Djs from "discord.js";
import { autoCompleteCharacters, calcOptions, getLangAndConfig } from "utils";
import { autoFocuseSign, autofocusTransform, calculate } from "./calc";
import "discord_ext";

export const math = {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const filter = autoCompleteCharacters(interaction, client, false) ?? [];
		const sign = autoFocuseSign(interaction);
		if (sign) return await interaction.respond(sign);
		const transform = autofocusTransform(interaction, interaction.locale);
		if (transform) return await interaction.respond(transform);
		return await interaction.respond(
			filter.map((result) => ({
				name: capitalizeBetweenPunct(result.capitalize()),
				value: result,
			}))
		);
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
