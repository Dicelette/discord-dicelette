import type { Count, DBCount } from "@dicelette/types";
import { describe, expect, it } from "vitest";
import {
	averageValue,
	calculateServerStats,
	filterByThreshold,
	mergeCountDefaults,
	normalizeGuildCount,
	percentage,
	serverStats,
	sortKarmaEntries,
} from "../src/karma";

describe("percentage", () => {
	it("returns 0.00 when total is 0", () => {
		expect(percentage(5, 0)).toBe("0.00");
	});

	it("computes a percentage with two decimals", () => {
		expect(percentage(1, 4)).toBe("25.00");
	});
});

describe("averageValue", () => {
	it("returns 0.00 when count is 0", () => {
		expect(averageValue(10, 0)).toBe("0.00");
	});

	it("computes an average with two decimals", () => {
		expect(averageValue(9, 4)).toBe("2.25");
	});
});

describe("mergeCountDefaults", () => {
	it("fills in missing fields and recomputes total", () => {
		const merged = mergeCountDefaults({ success: 3, failure: 2 });
		expect(merged).toEqual({
			success: 3,
			failure: 2,
			criticalSuccess: 0,
			criticalFailure: 0,
			total: 5,
		});
	});

	it("defaults to an all-zero count when given nothing", () => {
		expect(mergeCountDefaults()).toEqual({
			success: 0,
			failure: 0,
			criticalSuccess: 0,
			criticalFailure: 0,
			total: 0,
		});
	});

	it("preserves extra optional fields like streak data", () => {
		const merged = mergeCountDefaults({
			success: 1,
			failure: 0,
			consecutive: { success: 2, failure: 0 },
		});
		expect(merged.consecutive).toEqual({ success: 2, failure: 0 });
	});
});

describe("calculateServerStats", () => {
	const guildCount: DBCount = {
		alice: { success: 3, failure: 1, criticalSuccess: 1, criticalFailure: 0 },
		bob: { success: 0, failure: 0, criticalSuccess: 0, criticalFailure: 0 },
		carol: { success: 2, failure: 2, criticalSuccess: 0, criticalFailure: 1 },
	};

	it("aggregates totals across users with at least one roll, excluding zero-roll users", () => {
		const { rollTotal, totalCount, usersWithCounts } = calculateServerStats(guildCount);
		expect(usersWithCounts).toBe(2);
		expect(rollTotal).toBe(8);
		expect(totalCount).toEqual({
			success: 5,
			failure: 3,
			criticalSuccess: 1,
			criticalFailure: 1,
		});
	});

	it("returns all-zero stats for an empty guild", () => {
		const { rollTotal, usersWithCounts } = calculateServerStats({});
		expect(rollTotal).toBe(0);
		expect(usersWithCounts).toBe(0);
	});
});

describe("serverStats", () => {
	it("computes per-category percentage and per-user average", () => {
		const { percent, avg } = serverStats(
			{ success: 5, failure: 3, criticalSuccess: 1, criticalFailure: 1 },
			8,
			2
		);
		expect(percent.success).toBe("62.50");
		expect(percent.failure).toBe("37.50");
		expect(avg.success).toBe("2.50");
	});
});

describe("sortKarmaEntries", () => {
	type Entry = Count & { userId: string };
	const entries: Entry[] = [
		{
			userId: "alice",
			success: 9,
			failure: 1,
			criticalSuccess: 2,
			criticalFailure: 0,
			total: 10,
		},
		{
			userId: "bob",
			success: 3,
			failure: 7,
			criticalSuccess: 0,
			criticalFailure: 1,
			total: 10,
		},
		{
			userId: "carol",
			success: 0,
			failure: 0,
			criticalSuccess: 0,
			criticalFailure: 0,
			total: 0,
		},
	];

	it("ranks by raw count, dropping zero-value entries", () => {
		const ranked = sortKarmaEntries(entries, "success", "brut");
		expect(ranked.map((e) => e.userId)).toEqual(["alice", "bob"]);
	});

	it("ranks by each entry's own ratio, not the raw count", () => {
		// bob: 3/10 = 30% success, alice: 9/10 = 90% success — alice still wins either way,
		// so use failure to show ratio flips the raw-count order (bob has more raw failures
		// but alice has the higher failure *ratio* relative to... use a case where they diverge).
		const skewed: Entry[] = [
			{ userId: "dan", success: 1, failure: 9, criticalSuccess: 0, criticalFailure: 0 }, // 90% failure
			{
				userId: "eve",
				success: 90,
				failure: 10,
				criticalSuccess: 0,
				criticalFailure: 0,
			}, // 10% failure, but higher raw count
		];
		expect(sortKarmaEntries(skewed, "failure", "brut").map((e) => e.userId)).toEqual([
			"eve",
			"dan",
		]);
		expect(sortKarmaEntries(skewed, "failure", "ratio").map((e) => e.userId)).toEqual([
			"dan",
			"eve",
		]);
	});

	it("ignores ratio mode for the total option", () => {
		expect(sortKarmaEntries(entries, "total", "ratio").map((e) => e.userId)).toEqual(
			sortKarmaEntries(entries, "total", "brut").map((e) => e.userId)
		);
	});
});

describe("filterByThreshold", () => {
	type Entry = Count & { userId: string };
	const entries: Entry[] = [
		{
			userId: "alice",
			success: 9,
			failure: 1,
			criticalSuccess: 0,
			criticalFailure: 0,
			total: 10,
		},
		{
			userId: "bob",
			success: 3,
			failure: 2,
			criticalSuccess: 0,
			criticalFailure: 0,
			total: 5,
		},
		{
			userId: "carol",
			success: 1,
			failure: 0,
			criticalSuccess: 0,
			criticalFailure: 0,
			total: 1,
		},
	];

	it("drops entries below the threshold", () => {
		expect(filterByThreshold(entries, 5).map((e) => e.userId)).toEqual(["alice", "bob"]);
	});

	it("keeps entries exactly at the threshold", () => {
		expect(filterByThreshold(entries, 10).map((e) => e.userId)).toEqual(["alice"]);
	});

	it("is a no-op for a threshold of 0 or below", () => {
		expect(filterByThreshold(entries, 0)).toEqual(entries);
		expect(filterByThreshold(entries, -5)).toEqual(entries);
	});
});

describe("normalizeGuildCount", () => {
	it("flattens a DBCount into rows with defaults filled and recomputed totals", () => {
		const rows = normalizeGuildCount({
			alice: { success: 3, failure: 1, criticalSuccess: 1, criticalFailure: 0 },
		});
		expect(rows).toEqual([
			{
				userId: "alice",
				success: 3,
				failure: 1,
				criticalSuccess: 1,
				criticalFailure: 0,
				total: 4,
			},
		]);
	});
});
