import { capitalizeBetweenPunct } from "@dicelette/utils";
import type { EClient } from "client";
import { getStatistics } from "database";
import * as Djs from "discord.js";
import { autoCompleteCharacters, dbRollOptions, rollStatistique } from "utils";
import "discord_ext";

export const dbRoll = {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const filter = autoCompleteCharacters(interaction, client) ?? [];
		await interaction.respond(
			filter.map((result) => ({
				name: capitalizeBetweenPunct(result.capitalize()),
				value: result,
			}))
		);
	},
	data: (dbRollOptions(new Djs.SlashCommandBuilder()) as Djs.SlashCommandBuilder)
		.setNames("dbRoll.name")
		.setDescriptions("dbRoll.description")
		.setDefaultMemberPermissions(0),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const { userStatistique, options, ul, optionChar } =
			(await getStatistics(interaction, client)) ?? {};
		if (!userStatistique || !options || !ul) return;
		return await rollStatistique(
			interaction,
			client,
			userStatistique,
			options,
			ul,
			optionChar
		);
	},
};
