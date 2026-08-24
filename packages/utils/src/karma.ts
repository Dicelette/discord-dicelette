import type { Count, DBCount } from "@dicelette/types";

const DEFAULT_COUNT: Count = {
	criticalFailure: 0,
	criticalSuccess: 0,
	failure: 0,
	success: 0,
	total: 0,
};

/**
 * Fill in the missing (optional) fields of a `Count` with their defaults and
 * recompute `total` from `success` + `failure`. Centralizes the "fusion des
 * valeurs manquantes" logic previously duplicated across the karma leaderboard.
 */
export function mergeCountDefaults(count?: Partial<Count>): Count {
	const merged: Count = { ...DEFAULT_COUNT, ...count };
	merged.total = merged.success + merged.failure;
	return merged;
}

export function percentage(partial: number, total: number) {
	return total === 0 ? "0.00" : ((partial / total) * 100).toFixed(2);
}

export function averageValue(total: number, count: number) {
	return count === 0 ? "0.00" : (total / count).toFixed(2);
}

/**
 * Aggregate every user's karma counts for a guild into server-wide totals.
 * Users with no roll at all are excluded from `usersWithCounts`/`rollTotal`.
 */
export function calculateServerStats(guildCount: DBCount) {
	const totalCount: Count = {
		criticalFailure: 0,
		criticalSuccess: 0,
		failure: 0,
		success: 0,
	};

	let usersWithCounts = 0;
	let rollTotal = 0;

	for (const userId in guildCount) {
		const userCount = mergeCountDefaults(guildCount[userId]);
		const totalRolls = userCount.total ?? 0;

		if (totalRolls > 0) {
			totalCount.success += userCount.success;
			totalCount.failure += userCount.failure;
			totalCount.criticalSuccess += userCount.criticalSuccess;
			totalCount.criticalFailure += userCount.criticalFailure;
			usersWithCounts++;
			rollTotal += totalRolls;
		}
	}

	return { rollTotal, totalCount, usersWithCounts };
}

/**
 * Compute the average-per-user and server-wide percentage for each roll
 * category, given the server totals from `calculateServerStats`.
 */
export function serverStats(
	totalCount: Count,
	rollTotal: number,
	usersWithCounts: number
) {
	const percent = {
		criticalFailure: percentage(totalCount.criticalFailure, rollTotal),
		criticalSuccess: percentage(totalCount.criticalSuccess, rollTotal),
		failure: percentage(totalCount.failure, rollTotal),
		success: percentage(totalCount.success, rollTotal),
	};

	const avg = {
		criticalFailure: averageValue(totalCount.criticalFailure, usersWithCounts),
		criticalSuccess: averageValue(totalCount.criticalSuccess, usersWithCounts),
		failure: averageValue(totalCount.failure, usersWithCounts),
		success: averageValue(totalCount.success, usersWithCounts),
	};
	return { avg, percent };
}

const SUCCESS_STREAK_EMOJI = ["😎", "🔥", "🐐"];
const FAILURE_STREAK_EMOJI = ["😔", "💔", "💀"];

/**
 * Buckets a consecutive-streak length into the 3 tiers used for both the
 * bot's gauge emoji and the dashboard's streak icon — shared so the two
 * stay in lockstep. 0 means no active streak (value ≤ 1).
 */
export function streakTier(value: number): 0 | 1 | 2 | 3 {
	if (value <= 1) return 0;
	if (value <= 5) return 1;
	if (value <= 10) return 2;
	return 3;
}

/**
 * Selects an emoji representing a consecutive success or failure streak.
 *
 * @param type - "success" to choose from success emojis, "failure" to choose from failure emojis
 * @param value - The consecutive-streak length
 * @returns An emoji chosen by `type` and `value`: empty string for `value` ≤ 1; for `value` > 1 and ≤ 5 the first emoji; for `value` > 5 and ≤ 10 the second emoji; for `value` > 10 the third emoji
 */
export function gaugeEmoji(type: "success" | "failure", value: number) {
	const tier = streakTier(value);
	if (tier === 0) return "";
	const emoji = type === "success" ? SUCCESS_STREAK_EMOJI : FAILURE_STREAK_EMOJI;
	return emoji[tier - 1];
}

export type KarmaOption =
	| "criticalSuccess"
	| "criticalFailure"
	| "success"
	| "failure"
	| "total";
export type KarmaSortMode = "brut" | "ratio";
export const ALL_KARMA_OPTIONS: KarmaOption[] = [
	"total",
	"success",
	"failure",
	"criticalSuccess",
	"criticalFailure",
];

/**
 * Rank karma entries by a given option, either by raw count ("brut") or by
 * each user's ratio of that option against their own total ("ratio" — a
 * no-op for the "total" option, since a total-over-itself ratio is always 1
 * and carries no ranking information). Entries with a zero value for
 * `option` are dropped, matching the bot's own /karma leaderboard behavior.
 */
export function sortKarmaEntries<T extends Count>(
	entries: T[],
	option: KarmaOption,
	sortMode: KarmaSortMode
): T[] {
	return entries
		.filter((entry) => (entry[option] ?? 0) > 0)
		.sort((a, b) => {
			if (sortMode === "ratio" && option !== "total") {
				const totalA = a.total ?? 0;
				const totalB = b.total ?? 0;
				const ratioA = totalA === 0 ? 0 : (a[option] ?? 0) / totalA;
				const ratioB = totalB === 0 ? 0 : (b[option] ?? 0) / totalB;
				return ratioB - ratioA;
			}
			return (b[option] ?? 0) - (a[option] ?? 0);
		});
}

/**
 * Drops entries with fewer total rolls than `threshold` — matches the bot's
 * own /karma leaderboard threshold option (players with too few rolls to be
 * meaningfully ranked).
 */
export function filterByThreshold<T extends Count>(entries: T[], threshold: number): T[] {
	if (threshold <= 0) return entries;
	return entries.filter((entry) => (entry.total ?? 0) >= threshold);
}

export type LeaderBoardRow = {
	userId: string;
	success: number;
	failure: number;
	criticalSuccess: number;
	criticalFailure: number;
	total: number;
};

/** Flatten a guild's `DBCount` into a normalized, defaults-filled row list. */
export function normalizeGuildCount(guildCount: DBCount): LeaderBoardRow[] {
	return Object.entries(guildCount).map(([userId, data]) => {
		const count = mergeCountDefaults(data);
		return {
			userId,
			success: count.success,
			failure: count.failure,
			criticalSuccess: count.criticalSuccess,
			criticalFailure: count.criticalFailure,
			total: count.total ?? 0,
		};
	});
}
