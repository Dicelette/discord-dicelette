import type { KarmaOption, KarmaSortMode } from "@dicelette/utils";

/** Builds the shareable karma URL for a single user, mirroring the character share links. */
export function buildKarmaShareHref(guildId: string, userId: string): string {
	return `/karma/${guildId}/${userId}`;
}

/** Builds the shareable karma leaderboard URL, preserving the current rank-by/sort selection. */
export function buildKarmaLeaderboardShareHref(
	guildId: string,
	option: KarmaOption,
	sortMode: KarmaSortMode
): string {
	const params = new URLSearchParams({ option, sortMode });
	return `/karma/${guildId}/leaderboard?${params.toString()}`;
}
