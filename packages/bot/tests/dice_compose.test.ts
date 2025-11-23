import { describe, expect, it } from "vitest";
import {
	composeRollBase,
	extractComparator,
	getThreshold,
} from "../src/utils/dice_compose";

describe("extractComparator", () => {
	it("should extract a simple comparator from dice string", () => {
		const pattern = /([><=!]+)(.+)/;
		const result = extractComparator("2d6>=10", pattern);

		expect(result.dice).toBe("2d6");
		expect(result.comparator).toBe(">=10");
	});

	it("should handle dice without comparator", () => {
		const pattern = /([><=!]+)(.+)/;
		const result = extractComparator("2d6+3", pattern);

		expect(result.dice).toBe("2d6+3");
		expect(result.comparator).toBe("");
	});

	it("should extract comparator with complex operators", () => {
		const pattern = /([><=!]+)(.+)/;
		const result = extractComparator("1d20<=5", pattern);

		expect(result.dice).toBe("1d20");
		expect(result.comparator).toBe("<=5");
	});

	it("should handle dice with extra whitespace", () => {
		const pattern = /([><=!]+)(.+)/;
		const result = extractComparator("  2d6  >=  10  ", pattern);

		expect(result.dice).toBe("2d6");
		expect(result.comparator).toBe(">=  10");
	});

	it("should extract equality comparator", () => {
		const pattern = /([><=!]+)(.+)/;
		const result = extractComparator("3d8==15", pattern);

		expect(result.dice).toBe("3d8");
		expect(result.comparator).toBe("==15");
	});
});

describe("getThreshold", () => {
	it("should return original dice when no threshold provided", () => {
		const result = getThreshold("2d6>=10");

		expect(result).toBe("2d6>=10");
	});

	it("should replace existing comparator with threshold comparator", () => {
		const result = getThreshold("2d6>=10", ">=15");

		expect(result).toBe("2d6>=15");
	});

	it("should replace only the numeric value when threshold is a plain number", () => {
		const result = getThreshold("2d6>=10", "12");

		expect(result).toBe("2d6>=12");
	});

	it("should append threshold comparator when dice has none", () => {
		const result = getThreshold("2d6", ">=15");

		expect(result).toBe("2d6>=15");
	});

	it("should handle different comparator operators", () => {
		const result = getThreshold("1d20>=10", "<=5");

		expect(result).toBe("1d20<=5");
	});

	it("should preserve dice when threshold is empty string", () => {
		const result = getThreshold("2d6>=10", "");

		expect(result).toBe("2d6>=10");
	});

	it("should handle threshold with whitespace", () => {
		const result = getThreshold("2d6>=10", "  12  ");

		expect(result).toBe("2d6>=12");
	});
});

describe("composeRollBase", () => {
	const mockPattern = /([><=!]+)(.+)/;

	it("should compose a basic roll without stats", () => {
		const result = composeRollBase(
			"2d6>=10",
			undefined,
			mockPattern,
			undefined,
			undefined,
			"",
			""
		);

		expect(result.diceWithoutComparator).toBe("2d6");
		expect(result.rawComparator).toBe(">=10");
		expect(result.comparatorEvaluated).toBe(">=10");
		expect(result.roll).toBe("2d6>=10 ");
	});

	it("should compose roll with expression", () => {
		const result = composeRollBase(
			"2d6>=10",
			undefined,
			mockPattern,
			undefined,
			undefined,
			"+3",
			""
		);

		expect(result.diceWithoutComparator).toBe("2d6");
		expect(result.rawComparator).toBe(">=10");
		expect(result.roll).toBe("2d6+3>=10 ");
	});

	it("should compose roll with comments", () => {
		const result = composeRollBase(
			"2d6>=10",
			undefined,
			mockPattern,
			undefined,
			undefined,
			"",
			"# test comment"
		);

		expect(result.roll).toBe("2d6>=10 # test comment");
	});

	it("should apply threshold override", () => {
		const result = composeRollBase(
			"2d6>=10",
			">=15",
			mockPattern,
			undefined,
			undefined,
			"",
			""
		);

		expect(result.rawComparator).toBe(">=15");
		expect(result.roll).toBe("2d6>=15 ");
	});

	it("should remove critical markers from dice", () => {
		const result = composeRollBase(
			"2d6{cf:<=2}>=10",
			undefined,
			mockPattern,
			undefined,
			undefined,
			"",
			""
		);

		expect(result.diceWithoutComparator).toBe("2d6");
		expect(result.rawComparator).toBe(">=10");
	});

	it("should handle dice without comparator", () => {
		const result = composeRollBase(
			"2d6+3",
			undefined,
			mockPattern,
			undefined,
			undefined,
			"",
			""
		);

		expect(result.diceWithoutComparator).toBe("2d6+3");
		expect(result.rawComparator).toBe("");
		expect(result.comparatorEvaluated).toBe("");
		expect(result.roll).toBe("2d6+3 ");
	});

	it("should compose complete roll with all options", () => {
		const result = composeRollBase(
			"2d6{cf:<=2}>=10",
			">=12",
			mockPattern,
			undefined,
			undefined,
			"+5",
			"# attack roll"
		);

		expect(result.diceWithoutComparator).toBe("2d6");
		expect(result.rawComparator).toBe(">=12");
		expect(result.roll).toBe("2d6+5>=12 # attack roll");
	});

	it("should handle stats replacement in comparator", () => {
		const stats = { dexterity: 12, strength: 15 };
		const result = composeRollBase(
			"2d6>=&strength",
			undefined,
			mockPattern,
			stats,
			undefined,
			"",
			""
		);

		expect(result.comparatorEvaluated).toBe(">=15");
		expect(result.roll).toBe("2d6>=15 ");
	});

	it("should handle dollar sign replacement with statTotal", () => {
		const result = composeRollBase(
			"2d6>=$",
			undefined,
			mockPattern,
			undefined,
			"10",
			"",
			""
		);

		expect(result.comparatorEvaluated).toBe(">=10");
		expect(result.roll).toBe("2d6>=10 ");
	});

	it("should trim excess whitespace in final roll", () => {
		const result = composeRollBase(
			"  2d6  +  3  >=10",
			undefined,
			mockPattern,
			undefined,
			undefined,
			"",
			""
		);

		expect(result.roll).not.toContain("  ");
		expect(result.diceWithoutComparator).toBe("2d6+3");
	});
});

describe("Integration tests", () => {
	const mockPattern = /([><=!]+)(.+)/;

	it("should handle complete roll composition workflow", () => {
		// Simulate a typical roll macro workflow
		const dice = "2d6{cf:<=2}>=10";
		const threshold = ">=12";
		const expression = "+3";
		const comments = "# strength check";

		const result = composeRollBase(
			dice,
			threshold,
			mockPattern,
			undefined,
			undefined,
			expression,
			comments
		);

		expect(result.roll).toBe("2d6+3>=12 # strength check");
		expect(result.diceWithoutComparator).toBe("2d6");
		expect(result.rawComparator).toBe(">=12");
	});

	it("should handle statistique roll with stat replacement", () => {
		const stats = { dexterity: 14 };
		const dice = "1d20>=$";
		const threshold = undefined;
		const statTotal = "14";

		const result = composeRollBase(
			dice,
			threshold,
			mockPattern,
			stats,
			statTotal,
			"+2",
			""
		);

		expect(result.comparatorEvaluated).toBe(">=14");
		expect(result.roll).toBe("1d20+2>=14 ");
	});

	it("should preserve dice formula when no modifications needed", () => {
		const dice = "2d6+3";
		const result = composeRollBase(
			dice,
			undefined,
			mockPattern,
			undefined,
			undefined,
			"",
			""
		);

		expect(result.roll).toBe("2d6+3 ");
		expect(result.rawComparator).toBe("");
	});
});
