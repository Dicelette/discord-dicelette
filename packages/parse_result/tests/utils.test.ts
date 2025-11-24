import { describe, expect, it, vi } from "vitest";
import {
	convertExpression,
	replaceStatInDiceName,
	timestamp,
	trimAll,
} from "../src/utils";

// Mock moment
vi.mock("moment", () => ({
	default: () => ({
		unix: () => 1700000000,
	}),
}));

describe("timestamp", () => {
	it("should return empty string when time is false", () => {
		const result = timestamp(false);
		expect(result).toBe("");
	});

	it("should return empty string when time is undefined", () => {
		const result = timestamp();
		expect(result).toBe("");
	});

	it("should return formatted timestamp when time is true", () => {
		const result = timestamp(true);
		expect(result).toContain("<t:");
		expect(result).toContain(":d>");
		expect(result).toContain(":t>");
		expect(result).toContain("1700000000");
	});

	it("should include bullet separator", () => {
		const result = timestamp(true);
		expect(result).toMatch(/^ • /);
	});
});

describe("convertExpression", () => {
	it("should return empty string for 0", () => {
		const result = convertExpression("0");
		expect(result).toBe("");
	});

	it("should return positive number with + prefix", () => {
		expect(convertExpression("5")).toBe("+5");
		expect(convertExpression("10")).toBe("+10");
	});

	it("should return negative number as-is", () => {
		expect(convertExpression("-5")).toBe("-5");
		expect(convertExpression("-10")).toBe("-10");
	});

	it("should handle numeric strings", () => {
		expect(convertExpression("3")).toBe("+3");
		expect(convertExpression("-7")).toBe("-7");
	});

	it("should evaluate simple math expressions", () => {
		expect(convertExpression("2+3")).toBe("+5");
		expect(convertExpression("10-3")).toBe("+7");
		expect(convertExpression("2*3")).toBe("+6");
	});

	it("should handle expressions with statistics", () => {
		const stats = { strength: 5, dexterity: 3 };
		const result = convertExpression("strength+2", stats);
		expect(result).toBe("+7");
	});

	it("should replace dollar value in expression", () => {
		const result = convertExpression("$+5", undefined, "10");
		expect(result).toBe("+15");
	});

	it("should add + prefix to expression without sign", () => {
		const result = convertExpression("abc");
		expect(result).toMatch(/^\+/);
	});

	it("should preserve existing + or - sign", () => {
		expect(convertExpression("+5")).toBe("+5");
		expect(convertExpression("-5")).toBe("-5");
	});

	it("should handle complex expressions with stats and dollar", () => {
		const stats = { base: 10 };
		const result = convertExpression("base+$", stats, "5");
		expect(result).toBe("+15");
	});

	it("should handle expressions that cannot be evaluated", () => {
		const result = convertExpression("invalid_stat");
		expect(result).toMatch(/^\+/);
		expect(result).toContain("invalid_stat");
	});
});

describe("replaceStatInDiceName", () => {
	it("should replace stat name in parentheses with its value", () => {
		const stats = { strength: 15, dexterity: 10 };
		const result = replaceStatInDiceName("Attack(strength)", stats);
		expect(result).toBe("Attack(15)");
	});

	it("should return original if stat not found", () => {
		const stats = { strength: 15 };
		const result = replaceStatInDiceName("Attack(wisdom)", stats);
		expect(result).toBe("Attack(wisdom)");
	});

	it("should handle case-insensitive stat names", () => {
		const stats = { strength: 15 };
		const result = replaceStatInDiceName("Attack(STRENGTH)", stats);
		expect(result).toBe("Attack(15)");
	});

	it("should handle accented characters", () => {
		const stats = { force: 12 };
		const result = replaceStatInDiceName("Attaque(forcé)", stats);
		// Should work with removeAccents normalization
		expect(result).toMatch(/\d+/);
	});

	it("should use custom replacement when provided", () => {
		const stats = { strength: 15 };
		const result = replaceStatInDiceName("Attack(strength)", stats, "20");
		expect(result).toBe("Attack(20)");
	});

	it("should remove parentheses when replacement is empty string", () => {
		const stats = { strength: 15 };
		const result = replaceStatInDiceName("Attack(strength)", stats, "");
		expect(result).toBe("Attack");
	});

	it("should handle dice names without parentheses", () => {
		const stats = { strength: 15 };
		const result = replaceStatInDiceName("SimpleAttack", stats);
		expect(result).toBe("SimpleAttack");
	});

	it("should handle multiple parentheses but only replace first match", () => {
		const stats = { strength: 15, dexterity: 10 };
		const result = replaceStatInDiceName("Attack(strength)(dexterity)", stats);
		expect(result).toContain("(15)");
	});

	it("should preserve spaces and formatting", () => {
		const stats = { strength: 15 };
		const result = replaceStatInDiceName("My Attack (strength) Roll", stats);
		expect(result).toBe("My Attack (15) Roll");
	});

	it("should handle empty statistics object", () => {
		const result = replaceStatInDiceName("Attack(strength)", {});
		expect(result).toBe("Attack(strength)");
	});

	it("should handle undefined statistics", () => {
		const result = replaceStatInDiceName("Attack(strength)");
		expect(result).toBe("Attack(strength)");
	});
});

describe("trimAll", () => {
	it("should trim whitespace from simple dice string", () => {
		const result = trimAll("  1d20  ");
		expect(result).toBe("1d20");
	});

	it("should handle multiple dice separated by semicolons", () => {
		const result = trimAll("1d20; 2d6; 1d8");
		expect(result).toBe("1d20;2d6;1d8");
	});

	it("should preserve comments in brackets", () => {
		const result = trimAll("1d20 [attack roll]");
		expect(result).toContain("[attack roll]");
	});

	it("should trim each dice expression separately", () => {
		const result = trimAll("  1d20  ;  2d6  ");
		expect(result).toBe("1d20;2d6");
	});

	it("should handle dice with comments and trim properly", () => {
		const result = trimAll("1d20+5 [attack] ; 2d6 [damage]");
		expect(result).toContain("[attack]");
		expect(result).toContain("[damage]");
	});

	it("should handle empty string", () => {
		const result = trimAll("");
		expect(result).toBe("");
	});

	it("should handle single dice without semicolon", () => {
		const result = trimAll("1d20+5");
		expect(result).toBe("1d20+5");
	});

	it("should handle comments without whitespace", () => {
		const result = trimAll("1d20[comment]");
		expect(result).toContain("[comment]");
	});

	it("should preserve multiple comments", () => {
		const result = trimAll("1d20 [first] [second]");
		expect(result).toContain("[first]");
	});
});

describe("edge cases and integration", () => {
	it("should handle convertExpression with all parameters", () => {
		const stats = { str: 10 };
		const result = convertExpression("str+$+5", stats, "3");
		expect(result).toBe("+18");
	});

	it("should handle replaceStatInDiceName with complex names", () => {
		const stats = { my_stat: 20 };
		const result = replaceStatInDiceName("Roll(my_stat)", stats);
		expect(result).toBe("Roll(20)");
	});

	it("should handle trimAll with complex formatting", () => {
		const result = trimAll("  1d20 + 5  [attack]  ;  2d6  [damage]  ");
		const parts = result.split(";");
		expect(parts).toHaveLength(2);
		expect(parts[0]).toMatch(/\[attack\]/);
		expect(parts[1]).toMatch(/\[damage\]/);
	});

	it("should handle zero values in convertExpression", () => {
		const stats = { zero: 0 };
		const result = convertExpression("zero", stats);
		expect(result).toBe("");
	});
});
