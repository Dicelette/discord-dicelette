/**
 * Same as calc but without statistics
 */

import { capitalizeBetweenPunct } from "@dicelette/utils";
import { cmdLn, t } from "@dicelette/localization";
import * as Djs from "discord.js";
import { autoCompleteCharacters, calcOptions, getLangFromInteraction } from "utils";
import type { EClient } from "client";
import { autoFocuseSign, autofocusTransform, calculate } from "./calc";
import { getStatistics } from "database";

export const math = {
	data: (calcOptions(new Djs.SlashCommandBuilder(), false) as Djs.SlashCommandBuilder)
		.setName(t("math.title"))
		.setNameLocalizations(cmdLn("math.title"))
		.setDescription(t("math.description"))
		.setDescriptionLocalizations(cmdLn("math.description")),
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const filter = autoCompleteCharacters(interaction, client, false) ?? [];
		const sign = autoFocuseSign(interaction);
		if (sign) return await interaction.respond(sign);
		const transform = autofocusTransform(
			interaction,
			getLangFromInteraction(interaction, client.settings)
		);
		if (transform) return await interaction.respond(transform);
		return await interaction.respond(
			filter.map((result) => ({
				name: capitalizeBetweenPunct(result.capitalize()),
				value: result,
			}))
		);
	},
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		if (!interaction.guild || !interaction.channel) return;
		const { options, ul, optionChar } = (await getStatistics(interaction, client)) ?? {};
		if (!ul || !options) return;
		return await calculate(options, ul, interaction, client, undefined, optionChar);
	},
};
