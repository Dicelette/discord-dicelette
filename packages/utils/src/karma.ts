import type { Count, DBCount } from "@dicelette/types";

const DEFAULT_COUNT: Count = {
	criticalFailure: 0,
	criticalSuccess: 0,
	failure: 0,
	success: 0,
	total: 0,
};

/** Fills in missing `Count` fields with defaults and recomputes `total`. */
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

/** Aggregates every user's karma counts into server-wide totals; users with no rolls are excluded. */
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

/** Computes the average-per-user and server-wide percentage for each roll type. */
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

/** Buckets a streak length into 3 tiers; 0 means no active streak (value ≤ 1). */
export function streakTier(value: number): 0 | 1 | 2 | 3 {
	if (value <= 1) return 0;
	if (value <= 5) return 1;
	if (value <= 10) return 2;
	return 3;
}

/** Emoji representing a consecutive success/failure streak, scaled by streak length. */
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

/** Ranks karma entries by raw count or ratio for the given option; zero-value entries are dropped. */
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
