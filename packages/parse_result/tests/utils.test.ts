import { describe, expect, it, vi } from "vitest";
import { applyCustomFormula } from "../src/dice_extractor";
import {
	convertExpression,
	convertNameToValue,
	isNotADice,
	parseComparator,
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
		const stats = { dexterity: 3, strength: 5 };
		const result = convertExpression("strength+2", stats);
		expect(result).toBe("+7");
	});

	it("should replace dollar value in expression", () => {
		const result = convertExpression("$+5", undefined, "10");
		expect(result).toBe("+15");
	});

	it("should add + prefix to expression without sign", () => {
		const result = convertExpression("force", { force: 8 });
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
		const stats = { dexterity: 10, strength: 15 };
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
		const stats = { dexterity: 10, strength: 15 };
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

	it("should treat regex metacharacters in stat names as literal text", () => {
		// A stat named "a.b" must not act as the regex wildcard "." and match "aXb".
		const stats = { "a.b": 42 };
		expect(replaceStatInDiceName("Roll(a.b)", stats)).toBe("Roll(42)");
		expect(replaceStatInDiceName("Roll(aXb)", stats)).toBe("Roll(aXb)");
	});

	it("should not hang on a stat name shaped like a catastrophic-backtracking regex", () => {
		// GM-uploaded template stat names are not sanitized; a name like this must be
		// escaped before being compiled into a RegExp, or this call can block the
		// event loop for a very long time (ReDoS) instead of returning quickly.
		const stats = { "(a+)+": 1 };
		const start = performance.now();
		const result = replaceStatInDiceName(`Roll(${"a".repeat(40)}!)`, stats);
		expect(performance.now() - start).toBeLessThan(200);
		expect(result).toBe(`Roll(${"a".repeat(40)}!)`);
	});
});

describe("convertNameToValue", () => {
	it("should not hang on a stat name shaped like a catastrophic-backtracking regex", () => {
		const stats = { "(a+)+": 1 };
		const start = performance.now();
		convertNameToValue(`Roll(${"a".repeat(40)}!)`, stats);
		expect(performance.now() - start).toBeLessThan(200);
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

	it("should remove comments in brackets", () => {
		const result = trimAll("1d20 [attack roll]");
		// trimAll removes bracketed comments and only keeps dice formula
		expect(result).toBe("1d20");
	});

	it("should trim each dice expression separately", () => {
		const result = trimAll("  1d20  ;  2d6  ");
		expect(result).toBe("1d20;2d6");
	});

	it("should handle dice with comments and trim properly", () => {
		const result = trimAll("1d20+5 [attack] ; 2d6 [damage]");
		// trimAll processes each part separately
		expect(result).toContain("1d20+5");
		expect(result).toContain("2d6");
	});

	it("should handle empty string", () => {
		const result = trimAll("");
		expect(result).toBe("");
	});

	it("should handle single dice without semicolon", () => {
		const result = trimAll("1d20+5");
		expect(result).toBe("1d20+5");
	});

	it("should remove comments without whitespace", () => {
		const result = trimAll("1d20[comment]");
		// trimAll removes comments even when attached
		expect(result).toBe("1d20");
	});

	it("should handle multiple bracketed sections", () => {
		const result = trimAll("1d20 [first] [second]");
		// trimAll processes brackets as part of formula
		expect(result).toContain("1d20");
	});
});

describe("parseComparator", () => {
	it("should return undefined when there is no opposition", () => {
		expect(parseComparator("1d100>50")).toBeUndefined();
	});

	it("should detect a real opposition", () => {
		const result = parseComparator("1d100>50>=20");
		expect(result).toEqual({ sign: ">=", value: 20 });
	});

	// Regression: a comparator inside a {{...}} custom-formula block (e.g. {{x>20}})
	// must not be mistaken for a second/opposition comparator just because the
	// formula still contains an unresolved stat and combines with a real
	// comparator elsewhere in the dice (double-sign false positive).
	it("should not treat a comparator inside a {{...}} formula block as an opposition", () => {
		const stats = { dexterite: 40 };
		const dice = applyCustomFormula("1d100<=[$dexterite]", "$>=85?85:$");
		expect(dice).toBe("1d100<={{($dexterite)>=85?85:($dexterite)}}");
		expect(() => parseComparator(dice, stats)).not.toThrow();
		expect(parseComparator(dice, stats)).toBeUndefined();
	});

	it("should still detect a real opposition placed outside a {{...}} formula block", () => {
		const stats = { dexterite: 40 };
		const dice = applyCustomFormula("1d100<=[$dexterite]>=10", "$");
		expect(dice).toBe("1d100<={{($dexterite)}}>=10");
		const result = parseComparator(dice, stats);
		expect(result).toEqual({ sign: ">=", value: 10 });
	});

	it("should still throw for a genuinely invalid opposition value", () => {
		expect(() => parseComparator("1d100>50>invalid")).toThrow();
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
		// trimAll removes extra whitespace but keeps bracketed content
		expect(parts[0]).toContain("1d20");
		expect(parts[1]).toContain("2d6");
	});

	it("should handle zero values in convertExpression", () => {
		const stats = { zero: 0 };
		const result = convertExpression("zero", stats);
		// convertExpression returns "0" for zero values, not empty string
		expect(result).toBe("0");
	});
});

describe("isNotADice", () => {
	it("rejects an empty or whitespace-only message", () => {
		expect(isNotADice("")).toBe(true);
		expect(isNotADice("   ")).toBe(true);
	});

	it("rejects the '_ _' placeholder message", () => {
		expect(isNotADice("_ _")).toBe(true);
	});

	it("rejects a message that is a link", () => {
		expect(isNotADice("https://example.com")).toBe(true);
	});

	it("rejects a message starting with 'obviously not dice' punctuation", () => {
		expect(isNotADice("- une phrase normale")).toBe(true);
		expect(isNotADice("#hashtag")).toBe(true);
		expect(isNotADice(":) smiley")).toBe(true);
	});

	// Regression: a semi-direct bracket roll wrapped in Discord markdown emphasis
	// (bold/italic/underline/strikethrough/spoiler) starts with a marker character
	// that used to trigger the "obviously not dice" rejection outright, silently
	// dropping messages like "*mon message [1d6]*".
	it.each([
		["*mon message [1d6]*", "italic (single *)"],
		["**mon message [1d6]**", "bold (double *)"],
		["_mon message [1d6]_", "italic (single _)"],
		["__mon message [1d6]__", "underline (double _)"],
		["~~mon message [1d6]~~", "strikethrough"],
		["||mon message [1d6]||", "spoiler"],
	])("does not reject a semi-direct roll wrapped in markdown: %s (%s)", (content) => {
		expect(isNotADice(content)).toBe(false);
	});

	it("still rejects markdown markers with no actual content inside", () => {
		expect(isNotADice("***")).toBe(true);
		expect(isNotADice("___")).toBe(true);
		expect(isNotADice("~~~")).toBe(true);
		expect(isNotADice("|||")).toBe(true);
	});

	it("does not reject a plain semi-direct roll without markdown", () => {
		expect(isNotADice("mon message [1d6]")).toBe(false);
	});
});
