import type { DBCount } from "@dicelette/types";
import { describe, expect, it } from "vitest";
import {
	averageValue,
	calculateServerStats,
	mergeCountDefaults,
	normalizeGuildCount,
	percentage,
	serverStats,
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
