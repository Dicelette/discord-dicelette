import { cmdLn, t } from "@dicelette/localization";
import { capitalizeBetweenPunct } from "@dicelette/utils";
import type { EClient } from "client";
import { getStatistics } from "database";
import * as Djs from "discord.js";
import { autoCompleteCharacters, dbRollOptions, rollStatistique } from "utils";

export const dbRoll = {
	data: (dbRollOptions(new Djs.SlashCommandBuilder()) as Djs.SlashCommandBuilder)
		.setName(t("dbRoll.name"))
		.setNameLocalizations(cmdLn("dbRoll.name"))
		.setDescription(t("dbRoll.description"))
		.setDescriptionLocalizations(cmdLn("dbRoll.description"))
		.setDefaultMemberPermissions(0),
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const filter = autoCompleteCharacters(interaction, client) ?? [];
		await interaction.respond(
			filter.map((result) => ({
				name: capitalizeBetweenPunct(result.capitalize()),
				value: result,
			}))
		);
	},
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		const { userStatistique, options, ul, optionChar } =
			(await getStatistics(interaction, client)) ?? {};
		if (!userStatistique || !options || !ul || !optionChar) return;
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
