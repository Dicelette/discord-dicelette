import { t } from "@dicelette/localization";
import { filterStatsInDamage } from "@dicelette/parse_result";
import { capitalizeBetweenPunct, filterChoices } from "@dicelette/utils";
import type { EClient } from "@dicelette/bot-core";
import { getTemplateByInteraction } from "database";
import type * as Djs from "discord.js";
import { getGuildContext } from "utils";
import "discord_ext";

/**
 * Build autocomplete choices for damage/skill names.
 * Handles both user-specific and template damage names with filtering.
 *
 * @param interaction - Autocomplete interaction
 * @param client - Discord client
 * @param focused - Focused option info
 * @param options - Command options resolver
 * @returns Filtered choices array ready for respond()
 */
export async function buildDamageAutocompleteChoices(
	interaction: Djs.AutocompleteInteraction,
	client: EClient,
	focused: Djs.AutocompleteFocusedOption,
	options: Djs.CommandInteractionOptionResolver
): Promise<Djs.ApplicationCommandOptionChoiceData[]> {
	const ctx = getGuildContext(client, interaction.guild!.id);
	if (!ctx?.templateID) return [];

	const user = client.settings.get(interaction.guild!.id, `user.${interaction.user.id}`);
	if (!user && !ctx.templateID.damageName) return [];

	let choices: string[] = [];

	if (focused.name === t("common.name")) {
		const char = options.getString(t("common.character"));

		if (char && user) {
			const values = user.find((data) => data.charName?.subText(char));
			if (values?.damageName) choices = values.damageName;
		} else if (user) {
			for (const [, value] of Object.entries(user)) {
				if (value.damageName) choices = choices.concat(value.damageName);
			}
		}

		if (
			ctx.templateID.damageName &&
			ctx.templateID.damageName.length > 0 &&
			choices.length === 0
		) {
			const template = await getTemplateByInteraction(interaction, client);
			if (!template) choices = choices.concat(ctx.templateID.damageName);
			else if (template.damage) {
				choices = choices.concat(
					filterStatsInDamage(template.damage, ctx.templateID.damageName)
				);
			}
		}
	} else if (focused.name === t("common.character") && user) {
		const skill = options.getString(t("common.name"));
		const allCharactersFromUser = user
			.map((data) => data.charName ?? "")
			.filter((data) => data.length > 0);

		if (skill) {
			// Use pre-standardized array from context instead of mapping again
			if (ctx.standardizedDamageNames?.includes(skill.standardize())) {
				choices = allCharactersFromUser;
			} else {
				const values = user.filter((data) => {
					if (data.damageName)
						return data.damageName
							.map((data) => data.standardize())
							.includes(skill.standardize());
					return false;
				});
				choices = values
					.map((data) => data.charName ?? t("common.default"))
					.filter((data) => data.length > 0);
			}
		} else {
			choices = allCharactersFromUser;
		}
	}

	if (!choices || choices.length === 0) return [];

	const filter = filterChoices(choices, interaction.options.getFocused());
	return filter.map((result) => ({
		name: capitalizeBetweenPunct(result.capitalize()),
		value: result,
	}));
}

/**
 * Build autocomplete choices for stat names.
 * Uses cached standardized arrays for optimal performance.
 *
 * @param interaction - Autocomplete interaction
 * @param client - Discord client
 * @returns Filtered choices array ready for respond()
 */
export function buildStatsAutocompleteChoices(
	interaction: Djs.AutocompleteInteraction,
	client: EClient
): Djs.ApplicationCommandOptionChoiceData[] {
	const ctx = getGuildContext(client, interaction.guild!.id);
	if (!ctx?.templateID?.statsName) return [];

	const filter = filterChoices(
		ctx.templateID.statsName,
		interaction.options.getFocused()
	);

	return filter.map((result) => ({
		name: capitalizeBetweenPunct(result.capitalize()),
		value: result,
	}));
}
