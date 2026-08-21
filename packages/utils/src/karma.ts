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
