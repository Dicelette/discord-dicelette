import { describe, expect, it } from "vitest";
import {
	resolveUserAttributes,
	validateAttributeEntry,
	validateSnippetEntry,
} from "../src/userSettings";

describe("validateAttributeEntry", () => {
	it("should accept a plain number", () => {
		const result = validateAttributeEntry("strength", 10);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBe(10);
	});

	it("should accept a simple formula string", () => {
		const result = validateAttributeEntry("bonus", "strength + 2");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBe("strength + 2");
	});

	it("should trim string values", () => {
		const result = validateAttributeEntry("derived", "  strength * 2  ");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBe("strength * 2");
	});

	it("should reject NaN numbers", () => {
		const result = validateAttributeEntry("invalid", Number.NaN);
		expect(result.ok).toBe(false);
	});

	it("should reject empty string", () => {
		const result = validateAttributeEntry("empty", "");
		expect(result.ok).toBe(false);
	});

	it("should reject whitespace-only string", () => {
		const result = validateAttributeEntry("whitespace", "   ");
		expect(result.ok).toBe(false);
	});

	it("should reject hyphenated names", () => {
		const result = validateAttributeEntry("my-attr", 5);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toBe("containsHyphen");
	});

	it("should reject non-string/non-number values", () => {
		const result = validateAttributeEntry("bad", { value: 10 });
		expect(result.ok).toBe(false);
	});
});

describe("resolveUserAttributes", () => {
	it("should return undefined for undefined input", () => {
		const result = resolveUserAttributes(undefined);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBeUndefined();
	});

	it("should return empty map for empty object", () => {
		const result = resolveUserAttributes({});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual({});
	});

	it("should keep plain numbers as-is", () => {
		const result = resolveUserAttributes({ strength: 10, dexterity: 8 });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual({ strength: 10, dexterity: 8 });
		}
	});

	it("should evaluate simple formula with existing attributes", () => {
		const result = resolveUserAttributes({
			strength: 10,
			modifier: "strength + 2",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value?.modifier).toBe(12);
			expect(result.value?.strength).toBe(10);
		}
	});

	it("should evaluate multiple formulas", () => {
		const result = resolveUserAttributes({
			base: 10,
			bonus1: "base + 2",
			bonus2: "base * 2",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value?.base).toBe(10);
			expect(result.value?.bonus1).toBe(12);
			expect(result.value?.bonus2).toBe(20);
		}
	});

	it("should filter out empty string formulas", () => {
		const result = resolveUserAttributes({
			strength: 10,
			empty: "",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual({ strength: 10 });
		}
	});

	it("should handle formulas with spaces", () => {
		const result = resolveUserAttributes({
			strength: 10,
			modifier: "  strength + 3  ",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value?.modifier).toBe(13);
		}
	});

	it("should fail gracefully on invalid formula", () => {
		const result = resolveUserAttributes({
			strength: 10,
			badFormula: "strength ++ invalid",
		});
		expect(result.ok).toBe(false);
	});

	it("should fail on circular/self-referencing formula", () => {
		const result = resolveUserAttributes({
			attr: "attr + 1",
		});
		// evalCombinaison should handle this gracefully
		expect(result.ok).toBeFalsy();
	});

	it("should resolve formulas with mixed case and accents in references", () => {
		const result = resolveUserAttributes({
			Tactique: -5,
			"Discr\u00e9tion": -5,
			Parade: 10,
			comb: "1+2",
			Sub: "tactique+discr\u00e9tion",
			"Another comb": "comb+parade",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value?.comb).toBe(3);
			expect(result.value?.Sub).toBe(-10);
			expect(result.value?.["Another comb"]).toBe(13);
		}
	});
});

describe("validateSnippetEntry", () => {
	it("should accept valid dice formula without attributes", () => {
		const result = validateSnippetEntry("1d6 + 2");
		expect(result.ok).toBe(true);
	});

	it("should accept valid dice formula with plain number attributes", () => {
		const result = validateSnippetEntry("1d2+$str", {
			strength: 5,
		});
		expect(result.ok).toBe(true);
	});

	it("should evaluate formula attributes before validation", () => {
		const result = validateSnippetEntry("1d5+$bonus", {
			strength: 10,
			bonus: "strength/2",
		});
		console.log(result);
		expect(result.ok).toBe(true);
	});

	it("should reject invalid dice formula", () => {
		const result = validateSnippetEntry("not a dice formula");
		expect(result.ok).toBe(false);
	});

	it("should reject non-string input", () => {
		const result = validateSnippetEntry(123);
		expect(result.ok).toBe(false);
	});
});
