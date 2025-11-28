import { COMPILED_PATTERNS } from "@dicelette/utils";
import { describe, expect, it } from "vitest";
import { composeRollBase, extractComparator, getThreshold } from "../src/compose_roll";

describe("extractComparator", () => {
	const comparatorPattern = /([><=!]+)(.+)/;

	it("should extract comparator from dice string", () => {
		const result = extractComparator("1d20>=15", comparatorPattern);
		expect(result.comparator).toBe(">=15");
		expect(result.dice).toBe("1d20");
	});

	it("should handle dice without comparator", () => {
		const result = extractComparator("2d6+3", comparatorPattern);
		expect(result.comparator).toBe("");
		expect(result.dice).toBe("2d6+3");
	});

	it("should handle different comparison operators", () => {
		const tests = [
			{ expectedComp: ">10", expectedDice: "1d20", input: "1d20>10" },
			{ expectedComp: "<5", expectedDice: "2d6", input: "2d6<5" },
			{ expectedComp: "<=3", expectedDice: "1d8", input: "1d8<=3" },
			{ expectedComp: ">=8", expectedDice: "1d12", input: "1d12>=8" },
			{ expectedComp: "==2", expectedDice: "1d4", input: "1d4==2" },
			{ expectedComp: "!=7", expectedDice: "1d10", input: "1d10!=7" },
		];

		for (const { input, expectedComp, expectedDice } of tests) {
			const result = extractComparator(input, comparatorPattern);
			expect(result.comparator).toBe(expectedComp);
			expect(result.dice).toBe(expectedDice);
		}
	});

	it("should trim whitespace from result", () => {
		const result = extractComparator("  1d20>=15  ", comparatorPattern);
		expect(result.dice).toBe("1d20");
	});

	it("should handle complex dice expressions", () => {
		const result = extractComparator("2d6+1d4+5>=20", comparatorPattern);
		expect(result.comparator).toBe(">=20");
		expect(result.dice).toBe("2d6+1d4+5");
	});

	it("should handle empty string", () => {
		const result = extractComparator("", comparatorPattern);
		expect(result.comparator).toBe("");
		expect(result.dice).toBe("");
	});

	it("should handle comparator with expressions", () => {
		const result = extractComparator("1d20>=strength+5", comparatorPattern);
		expect(result.comparator).toBe(">=strength+5");
		expect(result.dice).toBe("1d20");
	});
});

describe("getThreshold", () => {
	it("should return dice unchanged when no threshold", () => {
		const result = getThreshold("1d20>=15");
		expect(result).toBe("1d20>=15");
	});

	it("should return dice unchanged when threshold is empty", () => {
		const result = getThreshold("1d20>=15", "");
		expect(result).toBe("1d20>=15");
	});

	it("should replace entire comparator when threshold has operator", () => {
		const result = getThreshold("1d20>=15", ">=20");
		expect(result).toBe("1d20>=20");
	});

	it("should add comparator when dice has none and threshold has operator", () => {
		const result = getThreshold("1d20", ">=15");
		expect(result).toBe("1d20>=15");
	});

	it("should replace only value when threshold is just a number", () => {
		const result = getThreshold("1d20>=15", "20");
		expect(result).toBe("1d20>=20");
	});

	it("should handle different operators in threshold", () => {
		const tests = [
			{ dice: "1d20>=10", expected: "1d20>15", threshold: ">15" },
			{ dice: "1d20>10", expected: "1d20<=5", threshold: "<=5" },
			{ dice: "1d20<10", expected: "1d20==8", threshold: "==8" },
		];

		for (const { dice, threshold, expected } of tests) {
			const result = getThreshold(dice, threshold);
			expect(result).toBe(expected);
		}
	});

	it("should handle threshold with expressions", () => {
		const result = getThreshold("1d20>=10", ">=strength+5");
		expect(result).toBe("1d20>=strength+5");
	});

	it("should preserve complex dice when replacing comparator", () => {
		const result = getThreshold("2d6+1d4+5>=20", ">=25");
		expect(result).toBe("2d6+1d4+5>=25");
	});

	it("should handle dice with spaces", () => {
		const result = getThreshold("1d20 >= 15", "20");
		expect(result).toContain("20");
	});

	it("should handle multiple comparison signs", () => {
		const result = getThreshold("1d20>=10", "<=5");
		expect(result).toBe("1d20<=5");
	});

	it("should preserve dice formula when only value changes", () => {
		const result = getThreshold("2d6+3>=10", "15");
		expect(result).toContain("2d6+3");
		expect(result).toContain("15");
	});

	it("should handle threshold with whitespace", () => {
		const result = getThreshold("1d20>=10", "  20  ");
		expect(result).toContain("20");
	});

	it("should not modify dice if threshold doesn't match pattern", () => {
		const result = getThreshold("1d20", "invalid");
		expect(result).toBe("1d20");
	});
});

describe("extractComparator and getThreshold integration", () => {
	const comparatorPattern = /([><=!]+)(.+)/;

	it("should work together for threshold replacement", () => {
		// First get threshold
		const withThreshold = getThreshold("1d20>=10", ">=15");
		expect(withThreshold).toBe("1d20>=15");

		// Then extract comparator
		const extracted = extractComparator(withThreshold, comparatorPattern);
		expect(extracted.dice).toBe("1d20");
		expect(extracted.comparator).toBe(">=15");
	});

	it("should handle adding comparator and extracting it", () => {
		const withThreshold = getThreshold("1d20", ">=15");
		const extracted = extractComparator(withThreshold, comparatorPattern);
		expect(extracted.dice).toBe("1d20");
		expect(extracted.comparator).toBe(">=15");
	});

	it("should handle complex workflow", () => {
		let dice = "2d6+1d4+5";
		dice = getThreshold(dice, ">=20");
		expect(dice).toBe("2d6+1d4+5>=20");

		const extracted = extractComparator(dice, comparatorPattern);
		expect(extracted.dice).toBe("2d6+1d4+5");
		expect(extracted.comparator).toBe(">=20");
	});

	it("should handle replacing and extracting", () => {
		let dice = "1d20>=10";
		dice = getThreshold(dice, "15");
		expect(dice).toBe("1d20>=15");

		const extracted = extractComparator(dice, comparatorPattern);
		expect(extracted.dice).toBe("1d20");
		expect(extracted.comparator).toBe(">=15");
	});
});

describe("composeRollBase", () => {
	it("basic composition", () => {
		const r = composeRollBase(
			"2d6>=10",
			undefined,
			COMPILED_PATTERNS.COMPARATOR,
			undefined,
			undefined,
			"",
			""
		);
		expect(r.diceWithoutComparator).toBe("2d6");
		expect(r.rawComparator).toBe(">=10");
		expect(r.roll).toBe("2d6>=10 ");
	});
	it("expression + comments", () => {
		const r = composeRollBase(
			"2d6>=10",
			undefined,
			COMPILED_PATTERNS.COMPARATOR,
			undefined,
			undefined,
			"+3",
			"# test"
		);
		expect(r.roll).toBe("2d6+3>=10 # test");
	});
	it("threshold override", () => {
		const r = composeRollBase(
			"2d6>=10",
			">=15",
			COMPILED_PATTERNS.COMPARATOR,
			undefined,
			undefined,
			"",
			""
		);
		expect(r.rawComparator).toBe(">=15");
		expect(r.roll).toBe("2d6>=15 ");
	});
	it("removes critical markers", () => {
		const r = composeRollBase(
			"2d6{cf:<=2}>=10",
			undefined,
			COMPILED_PATTERNS.COMPARATOR,
			undefined,
			undefined,
			"",
			""
		);
		expect(r.diceWithoutComparator).toBe("2d6");
	});
	it("Statistics in expression", () => {
		const r = composeRollBase(
			"1d20+strength>=15",
			undefined,
			COMPILED_PATTERNS.COMPARATOR,
			{ strength: 3 },
			undefined,
			"",
			""
		);
		expect(r.diceWithoutComparator).toBe("1d20+3");
		expect(r.rawComparator).toBe(">=15");
		expect(r.roll).toBe("1d20+3>=15 ");
	});
	it("Statistics in comparator", () => {
		const r = composeRollBase(
			"1d20>=strength+5",
			undefined,
			COMPILED_PATTERNS.COMPARATOR,
			{ strength: 4 },
			undefined,
			"",
			""
		);
		expect(r.diceWithoutComparator).toBe("1d20");
		expect(r.rawComparator).toBe(">=4+5");
		expect(r.roll).toBe("1d20>=4+5 ");
	});
	it("Statistics in threshold", () => {
		const r = composeRollBase(
			"1d20>=10",
			">=strength+5",
			COMPILED_PATTERNS.COMPARATOR,
			{ strength: 6 },
			undefined,
			"",
			""
		);
		expect(r.diceWithoutComparator).toBe("1d20");
		expect(r.rawComparator).toBe(">=6+5");
		expect(r.roll).toBe("1d20>=6+5 ");
	});
});

describe("edge cases", () => {
	const comparatorPattern = /([><=!]+)(.+)/;

	it("should handle very long dice expressions", () => {
		const longDice = "1d20+2d6+1d4+3d8+5+10+15>=100";
		const extracted = extractComparator(longDice, comparatorPattern);
		expect(extracted.comparator).toBe(">=100");
		expect(extracted.dice).toContain("1d20");
	});

	it("should handle negative numbers in comparator", () => {
		const result = extractComparator("1d20>=-5", comparatorPattern);
		expect(result.comparator).toBe(">=-5");
	});

	it("should handle getThreshold with negative threshold", () => {
		const result = getThreshold("1d20>=5", "-10");
		expect(result).toContain("-10");
	});

	it("should handle multiple operators in sequence", () => {
		const result = getThreshold("1d20>=10", "<=5");
		expect(result).toBe("1d20<=5");
	});
});
