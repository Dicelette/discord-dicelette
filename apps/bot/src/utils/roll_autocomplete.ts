import type { EClient } from "@dicelette/client";
import { getGuildContext } from "@dicelette/helpers";
import { t } from "@dicelette/localization";
import { capitalizeBetweenPunct, filterChoices } from "@dicelette/utils";
import type * as Djs from "discord.js";
import "@dicelette/discord_ext";

type MacroSourceEntry = {
	charName?: string | null;
	damageName: string[];
};

function dedupeByStandardized(values: string[]) {
	const seen = new Set<string>();
	const deduped: string[] = [];
	for (const value of values) {
		const key = value.standardize();
		if (seen.has(key)) continue;
		seen.add(key);
		deduped.push(value);
	}
	return deduped;
}

function settingsToMacroEntries(
	userSettings: { charName?: string | null; damageName?: string[] }[] | undefined
): MacroSourceEntry[] {
	if (!userSettings) return [];
	return userSettings.map((data) => ({
		charName: data.charName,
		damageName: data.damageName ?? [],
	}));
}

function memoryToMacroEntries(
	characters: { userName?: string | null; damage?: Record<string, string> }[] | undefined
): MacroSourceEntry[] {
	if (!characters) return [];
	return characters.map((char) => ({
		charName: char.userName,
		damageName: Object.keys(char.damage ?? {}),
	}));
}

function hasAnyDamage(entries: MacroSourceEntry[]) {
	return entries.some((entry) => entry.damageName.length > 0);
}

function findCharDamage(entries: MacroSourceEntry[], charName: string) {
	const found = entries.find((entry) => entry.charName?.subText(charName));
	return found?.damageName ?? [];
}

function flattenDamage(entries: MacroSourceEntry[]) {
	const result: string[] = [];
	for (const entry of entries) result.push(...entry.damageName);
	return result;
}

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
export function buildDamageAutocompleteChoices(
	interaction: Djs.AutocompleteInteraction,
	client: EClient,
	focused: Djs.AutocompleteFocusedOption,
	options: Djs.CommandInteractionOptionResolver
): Djs.ApplicationCommandOptionChoiceData[] {
	const ctx = getGuildContext(client, interaction.guild!.id);
	if (!ctx?.templateID) return [];

	const userSettings = client.settings.get(
		interaction.guild!.id,
		`user.${interaction.user.id}`
	);
	const userMemory = client.characters.get(interaction.guild!.id, interaction.user.id);
	const settingsEntries = settingsToMacroEntries(userSettings);
	const memoryEntries = memoryToMacroEntries(userMemory);
	const templateDamage = ctx.templateID.damageName ?? [];

	let choices: string[] = [];

	if (focused.name === t("common.name")) {
		const char = options.getString(t("common.character"));

		if (char) {
			const settingsDamage = findCharDamage(settingsEntries, char);
			if (settingsDamage.length > 0) {
				choices = settingsDamage;
			} else {
				const memoryDamage = findCharDamage(memoryEntries, char);
				if (memoryDamage.length > 0) choices = memoryDamage;
				else choices = templateDamage;
			}
		} else {
			const allSettingsDamage = flattenDamage(settingsEntries);
			if (allSettingsDamage.length > 0) {
				choices = allSettingsDamage;
			} else {
				const allMemoryDamage = flattenDamage(memoryEntries);
				if (allMemoryDamage.length > 0) choices = allMemoryDamage;
				else choices = templateDamage;
			}
		}
		choices = dedupeByStandardized(choices);
	} else if (focused.name === t("common.character")) {
		const skill = options.getString(t("common.name"));
		const sourceEntries = hasAnyDamage(settingsEntries)
			? settingsEntries
			: hasAnyDamage(memoryEntries)
				? memoryEntries
				: settingsEntries;
		const allCharactersFromUser = sourceEntries
			.map((data) => data.charName ?? "")
			.filter((data) => data.length > 0);

		if (skill) {
			// Use pre-standardized array from context instead of mapping again
			if (ctx.standardizedDamageNames?.includes(skill.standardize())) {
				choices = allCharactersFromUser;
			} else {
				const standardizedSkill = skill.standardize();
				const values = sourceEntries.filter((data) =>
					data.damageName.some(
						(macroName) => macroName.standardize() === standardizedSkill
					)
				);
				choices = values
					.map((data) => data.charName ?? t("common.default"))
					.filter((data) => data.length > 0);
			}
		} else {
			choices = allCharactersFromUser;
		}
		choices = dedupeByStandardized(choices);
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
