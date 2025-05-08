import { describe, expect, it } from "vitest";
import { convertExpression, getExpression } from "../src/utils";

describe("convertExpression", () => {
	it("should return a positive number with a plus sign", () => {
		expect(convertExpression("5")).toBe("+5");
	});

	it("should return a negative number as is", () => {
		expect(convertExpression("-3")).toBe("-3");
	});

	it("should return an empty string for zero", () => {
		expect(convertExpression("0")).toBe("");
	});

	it("should evaluate a mathematical expression", () => {
		expect(convertExpression("2+3")).toBe("+5");
	});

	it("should handle statistics and statValue", () => {
		const statistics = { strength: 5 };
		expect(convertExpression("strength", statistics)).toBe("+5");
	});

	it("should handle invalid expressions gracefully", () => {
		expect(convertExpression("invalid")).toBe("+invalid");
	});

	it("should return the original modifier if it starts with + or -", () => {
		expect(convertExpression("+2")).toBe("+2");
		expect(convertExpression("-2")).toBe("-2");
	});
	it("should correctly be converted to a number", () => {
		const result = convertExpression("2+5");
		expect(Number.parseInt(result)).toBe(7);
	});
	it("Should return the default value with {exp||2}", () => {
		const dice = "1d{exp||2}";
		const res = getExpression(dice, "0");
		expect(res.dice).toBe("1d2");
	});
	it("Should return the default value with {exp||2}", () => {
		const dice = "1d{exp||2}";
		const res = getExpression(dice, "2+5");
		expect(res.dice).toBe("1d7");
	});
	it("Should replace with the correct value in multiple exp", () => {
		const dice = "1d{exp||2}+{exp||6}";
		const res = getExpression(dice, "0");
		expect(res.dice).toBe("1d2+6");
	});
	it("Should replace with the correct value in multiple exp", () => {
		const dice = "1d{exp||2}+{exp||6}";
		const res = getExpression(dice, "5+8");
		expect(res.dice).toBe("1d13+13");
	});
	it("Should be keept as is if no exp", () => {
		const dice = "1d100";
		const res = getExpression(dice, "5+8");
		expect(res.dice).toBe("1d100");
		expect(res.expressionStr).toBe("+13");
	});
});
