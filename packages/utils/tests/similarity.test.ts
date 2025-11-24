import { describe, expect, it } from "vitest";
import {
	calculateSimilarity,
	findBestStatMatch,
	levenshteinDistance,
} from "../src/similarity";

describe("levenshteinDistance", () => {
	it("should return 0 for identical strings", () => {
		expect(levenshteinDistance("test", "test")).toBe(0);
		expect(levenshteinDistance("", "")).toBe(0);
	});

	it("should return the length for completely different strings", () => {
		expect(levenshteinDistance("abc", "def")).toBe(3);
		expect(levenshteinDistance("test", "wxyz")).toBe(4);
	});

	it("should calculate distance for single character changes", () => {
		expect(levenshteinDistance("cat", "bat")).toBe(1); // substitution
		expect(levenshteinDistance("cat", "cats")).toBe(1); // insertion
		expect(levenshteinDistance("cats", "cat")).toBe(1); // deletion
	});

	it("should calculate distance for multiple changes", () => {
		expect(levenshteinDistance("kitten", "sitting")).toBe(3);
		expect(levenshteinDistance("saturday", "sunday")).toBe(3);
	});

	it("should handle empty strings", () => {
		expect(levenshteinDistance("", "test")).toBe(4);
		expect(levenshteinDistance("test", "")).toBe(4);
	});

	it("should be case-sensitive", () => {
		expect(levenshteinDistance("Test", "test")).toBe(1);
		expect(levenshteinDistance("ABC", "abc")).toBe(3);
	});

	it("should handle special characters", () => {
		expect(levenshteinDistance("hello!", "hello?")).toBe(1);
		expect(levenshteinDistance("c'est", "c est")).toBe(1);
	});
});

describe("calculateSimilarity", () => {
	it("should return 1.0 for identical strings", () => {
		expect(calculateSimilarity("test", "test")).toBe(1.0);
		expect(calculateSimilarity("", "")).toBe(1.0);
		expect(calculateSimilarity("hello world", "hello world")).toBe(1.0);
	});

	it("should return 0.0 for completely different strings", () => {
		expect(calculateSimilarity("abc", "def")).toBe(0);
		expect(calculateSimilarity("test", "wxyz")).toBe(0);
	});

	it("should calculate similarity between 0 and 1", () => {
		const similarity1 = calculateSimilarity("cat", "bat");
		expect(similarity1).toBeGreaterThan(0);
		expect(similarity1).toBeLessThan(1);
		expect(similarity1).toBeCloseTo(0.6666, 4);

		const similarity2 = calculateSimilarity("kitten", "sitting");
		expect(similarity2).toBeGreaterThan(0);
		expect(similarity2).toBeLessThan(1);
	});

	it("should handle strings of different lengths", () => {
		const similarity = calculateSimilarity("cat", "category");
		expect(similarity).toBeGreaterThan(0);
		expect(similarity).toBeLessThan(1);
	});

	it("should be symmetric", () => {
		const sim1 = calculateSimilarity("abc", "def");
		const sim2 = calculateSimilarity("def", "abc");
		expect(sim1).toBe(sim2);
	});

	it("should handle empty strings", () => {
		expect(calculateSimilarity("", "test")).toBe(0);
		expect(calculateSimilarity("test", "")).toBe(0);
	});

	it("should handle case sensitivity", () => {
		const similarity = calculateSimilarity("Test", "test");
		expect(similarity).toBeGreaterThan(0);
		expect(similarity).toBeLessThan(1);
	});
});

describe("findBestStatMatch", () => {
	it("should return exact match when available", () => {
		const stats = new Map([
			["strength", "str"],
			["dexterity", "dex"],
			["constitution", "con"],
		]);

		expect(findBestStatMatch("strength", stats)).toBe("str");
		expect(findBestStatMatch("dexterity", stats)).toBe("dex");
	});

	it("should return undefined when no match found", () => {
		const stats = new Map([
			["strength", "str"],
			["dexterity", "dex"],
		]);

		expect(findBestStatMatch("intelligence", stats)).toBeUndefined();
		expect(findBestStatMatch("wisdom", stats)).toBeUndefined();
	});

	it("should find startsWith matches", () => {
		const stats = new Map([
			["strength", "str"],
			["dexterity", "dex"],
			["constitution", "con"],
		]);

		expect(findBestStatMatch("str", stats)).toBe("str");
		expect(findBestStatMatch("dex", stats)).toBe("dex");
	});

	it("should find endsWith matches", () => {
		const stats = new Map([
			["my_strength", "str"],
			["your_dexterity", "dex"],
		]);

		expect(findBestStatMatch("strength", stats)).toBe("str");
		expect(findBestStatMatch("dexterity", stats)).toBe("dex");
	});

	it("should find includes matches", () => {
		const stats = new Map([
			["character_strength_bonus", "str"],
			["player_dexterity_modifier", "dex"],
		]);

		expect(findBestStatMatch("strength", stats)).toBe("str");
		expect(findBestStatMatch("dexterity", stats)).toBe("dex");
	});

	it("should prefer shorter matches when multiple candidates", () => {
		const stats = new Map([
			["strength", "short"],
			["character_strength_bonus", "long"],
		]);

		const result = findBestStatMatch("str", stats);
		expect(result).toBe("short");
	});

	it("should handle empty map", () => {
		const stats = new Map<string, string>();
		expect(findBestStatMatch("anything", stats)).toBeUndefined();
	});

	it("should handle single entry map", () => {
		const stats = new Map([["force", "str"]]);
		expect(findBestStatMatch("force", stats)).toBe("str");
		expect(findBestStatMatch("for", stats)).toBe("str");
	});

	it("should prefer exact match over partial matches", () => {
		const stats = new Map([
			["str", "exact"],
			["strength", "partial"],
		]);

		expect(findBestStatMatch("str", stats)).toBe("exact");
	});

	it("should handle complex stat names", () => {
		const stats = new Map([
			["vitesse_de_déplacement", "speed"],
			["points_de_vie_maximum", "hp_max"],
		]);

		expect(findBestStatMatch("vitesse_de_déplacement", stats)).toBe("speed");
		expect(findBestStatMatch("points_de_vie_maximum", stats)).toBe("hp_max");
	});
});
