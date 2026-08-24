import type { KarmaOption, KarmaSortMode } from "@dicelette/utils";

/** Builds the shareable karma URL for a single user, mirroring the character share links. */
export function buildKarmaShareHref(guildId: string, userId: string): string {
	return `/karma/${guildId}/${userId}`;
}

/** Builds the shareable karma leaderboard URL, preserving the current rank-by/sort/threshold selection. */
export function buildKarmaLeaderboardShareHref(
	guildId: string,
	option: KarmaOption,
	sortMode: KarmaSortMode,
	threshold: number
): string {
	const params = new URLSearchParams({ option, sortMode });
	if (threshold > 0) params.set("threshold", String(threshold));
	return `/karma/${guildId}/leaderboard?${params.toString()}`;
}
