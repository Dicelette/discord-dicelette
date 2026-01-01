import "uniformize";
import type { EClient } from "@dicelette/client";
import type { SortOrder } from "@dicelette/core";
import type { GuildData } from "@dicelette/types";

/**
 * Cached guild context to avoid repeated settings lookups.
 * Contains frequently accessed guild data with pre-computed values.
 */
export interface GuildContext {
	/** Guild settings including template and user data */
	settings: GuildData;
	/** Pre-standardized damage names for faster autocomplete */
	standardizedDamageNames?: string[];
	/** Pre-standardized stats names for faster autocomplete */
	standardizedStatsNames?: string[];
	/** Template ID data */
	templateID?: GuildData["templateID"];
	sortOrder?: SortOrder;
	disableCompare?: boolean;
}

/**
 * Get comprehensive guild context with pre-computed values for optimal performance.
 * Caches standardized arrays to avoid repeated map operations in autocomplete and validation.
 * Use ctx.standardizedDamageNames instead of damageNames.map(x => x.standardize())
 * @param client - Discord client with settings
 * @param guildId - Guild ID to fetch context for
 * @returns Guild context with cached values or undefined if guild not found
 *
 * @example
 * const ctx = getGuildContext(client, interaction.guild!.id);
 * if (!ctx?.templateID) return;
 */
export function getGuildContext(
	client: EClient,
	guildId: string
): GuildContext | undefined {
	const settings = client.settings.get(guildId);
	if (!settings) return undefined;

	const templateID = settings.templateID;

	return {
		settings,
		standardizedDamageNames: templateID?.damageName?.map((x: string) => x.standardize()),
		standardizedStatsNames: templateID?.statsName?.map((x: string) => x.standardize()),
		templateID,
	};
}

/**
 * Get user snippets for a specific guild and user.
 * Convenience wrapper to avoid repeated userSettings lookups.
 *
 * @param client - Discord client with user settings
 * @param guildId - Guild ID
 * @param userId - User ID
 * @returns User snippets object or empty object if not found
 */
export function getUserSnippets(
	client: EClient,
	guildId: string,
	userId: string
): Record<string, string> {
	return client.userSettings.get(guildId, userId)?.snippets ?? {};
}

/**
 * Cached comparison result to avoid repeated standardize calls.
 * Use this when comparing the same values multiple times.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if standardized values match
 */
export function standardizeEquals(a: string, b: string): boolean {
	return a.standardize() === b.standardize();
}
