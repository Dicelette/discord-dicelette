import "uniformize";
import type { EClient } from "@dicelette/client";
import type { SortOrder } from "@dicelette/core";
import type { GuildData, UserSettingsData } from "@dicelette/types";

/** Cached guild context, pre-computed to avoid repeated settings lookups. */
export interface GuildContext {
	settings: GuildData;
	/** Pre-standardized damage names for faster autocomplete */
	standardizedDamageNames?: string[];
	/** Pre-standardized stats names for faster autocomplete */
	standardizedStatsNames?: string[];
	/** Pre-standardized excluded stat names for faster checks */
	standardizedExcludedStats?: string[];
	templateID?: GuildData["templateID"];
	sortOrder?: SortOrder;
	disableCompare?: boolean;
}

/** Guild context with cached values (e.g. `ctx.standardizedDamageNames` instead of re-mapping each time), or undefined if the guild isn't found. */
export function getGuildContext(
	client: EClient,
	guildId: string
): GuildContext | undefined {
	const settings = client.settings.get(guildId);
	if (!settings) return undefined;

	const templateID = settings.templateID;
	const derived = client.getTemplateAutocompleteCache(templateID);

	return {
		settings,
		standardizedDamageNames: derived?.damageNames,
		standardizedExcludedStats: derived?.excludedStats,
		standardizedStatsNames: derived?.statsNames,
		templateID,
	};
}

/** Gets a user's snippets for a guild (empty object if none). */
export function getUserSnippets(
	client: EClient,
	guildId: string,
	userId: string
): Record<string, string> {
	return client.userSettings.get(guildId, userId)?.snippets ?? {};
}

export function standardizeEquals(a: string, b: string): boolean {
	return a.standardize() === b.standardize();
}

/** Resolves the active custom formula; guild-level takes priority over user-level. */
export function resolveCustomFormula(
	guildData?: GuildData | null,
	userSettings?: UserSettingsData | null
): string | undefined {
	return guildData?.customFormula ?? userSettings?.customFormula;
}
