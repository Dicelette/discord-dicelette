import { COMPILED_PATTERNS } from "@dicelette/utils";
import { describe, expect, it } from "vitest";
import { composeRollBase, extractComparator, getThreshold } from "../src/compose_roll";

describe("extractComparator", () => {
	it("extracts simple comparator", () => {
		const result = extractComparator("2d6>=10", COMPILED_PATTERNS.COMPARATOR);
		expect(result.dice).toBe("2d6");
		expect(result.comparator).toBe(">=10");
	});
	it("returns original when none", () => {
		const result = extractComparator("2d6+3", COMPILED_PATTERNS.COMPARATOR);
		expect(result.dice).toBe("2d6+3");
		expect(result.comparator).toBe("");
	});
});

describe("getThreshold", () => {
	it("no threshold -> unchanged", () => {
		expect(getThreshold("2d6>=10")).toBe("2d6>=10");
	});
	it("full comparator replacement", () => {
		expect(getThreshold("2d6>=10", ">=15")).toBe("2d6>=15");
	});
	it("numeric override", () => {
		expect(getThreshold("2d6>=10", "12")).toBe("2d6>=12");
	});
	it("append when none", () => {
		expect(getThreshold("2d6", ">=15")).toBe("2d6>=15");
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
});
