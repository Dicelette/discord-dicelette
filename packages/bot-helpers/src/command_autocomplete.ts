import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import { filterChoices } from "@dicelette/utils";
import type * as Djs from "discord.js";
import { getInteractionContext } from "./interaction_context";

/**
 * Generic autocomplete helper that extracts common context
 * Returns choices array, focused option, guild data, translation function, and user ID
 */
export function autoComplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const fixed = options.getFocused(true);
	const { ul, config: guildData } = getInteractionContext(client, interaction);
	if (!guildData) return;
	const choices: string[] = [];
	let userID = options.get(t("display.userLowercase"))?.value ?? interaction.user.id;
	if (typeof userID !== "string") userID = interaction.user.id;
	return { choices, fixed, guildData, ul, userID };
}

/**
 * Autocomplete helper for character names and statistics
 * Filters choices based on guild template and user data
 */
export function autoCompleteCharacters(
	interaction: Djs.AutocompleteInteraction,
	client: EClient,
	exclude = true
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const focused = options.getFocused(true);
	const guildData = client.settings.get(interaction.guild!.id);
	if (!guildData || !guildData.templateID) return;
	let choices: string[] = [];

	if (focused.name === t("common.statistic")) {
		choices = guildData.templateID.statsName;
		if (exclude)
			choices = choices.filter(
				(item) => !guildData.templateID.excludedStats?.includes(item)
			);
	} else if (focused.name === t("common.character")) {
		//get user characters
		const userData = client.settings.get(
			interaction.guild!.id,
			`user.${interaction.user.id}`
		);
		if (!userData) return;
		choices = userData
			.map((data) => data.charName ?? "")
			.filter((data) => data.length > 0);
	}
	if (!choices || choices.length === 0) return;
	return filterChoices(choices, interaction.options.getFocused());
}
