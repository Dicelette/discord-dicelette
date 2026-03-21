import { describe, expect, it } from "vitest";
import { extractAndMergeComments } from "../src/comment_utils";

describe("extractAndMergeComments", () => {
	it("should extract and clean dice without comments", () => {
		const result = extractAndMergeComments("2d6+3");

		expect(result.cleanedDice).toBe("2d6+3");
		expect(result.mergedComments).toBeUndefined();
	});

	it("should extract global comments from dice formula", () => {
		const result = extractAndMergeComments("2d6 # attack roll");

		expect(result.cleanedDice).toBe("2d6");
		expect(result.mergedComments).toBe("attack roll");
	});

	it("should merge user comments with dice comments", () => {
		const result = extractAndMergeComments("2d6 # attack", "with advantage");

		expect(result.cleanedDice).toBe("2d6");
		expect(result.mergedComments).toBe("attack with advantage");
	});

	it("should deduplicate identical comments", () => {
		const result = extractAndMergeComments("2d6 # fire damage", "fire damage");

		expect(result.cleanedDice).toBe("2d6");
		expect(result.mergedComments).toBe("fire damage");
	});

	it("should preserve stat markers", () => {
		const result = extractAndMergeComments("2d6 %%[__strength__]%% # attack");

		expect(result.cleanedDice).toBe("2d6");
		expect(result.mergedComments).toBe("%%[__strength__]%% attack");
	});

	it("should handle multiple stat markers", () => {
		const result = extractAndMergeComments(
			"2d6 %%[__strength__]%% %%[__dexterity__]%% # test"
		);

		expect(result.cleanedDice).toBe("2d6");
		expect(result.mergedComments).toContain("%%[__strength__]%%");
		expect(result.mergedComments).toContain("%%[__dexterity__]%%");
	});

	it("should deduplicate stat markers", () => {
		const result = extractAndMergeComments(
			"2d6 %%[__strength__]%%",
			"%%[__strength__]%% test"
		);

		expect(result.cleanedDice).toBe("2d6");
		// Should only have one strength marker
		const markers = result.mergedComments?.match(/%%\[__strength__]%%/g);
		expect(markers?.length).toBe(1);
	});

	it("should format comments with # for shared dice notation", () => {
		const result = extractAndMergeComments("2d6;1d4 # shared roll", "bonus");

		expect(result.cleanedDice).toBe("2d6;1d4");
		expect(result.mergedComments?.startsWith("#")).toBe(true);
		expect(result.mergedComments).toContain("shared roll");
		expect(result.mergedComments).toContain("bonus");
	});

	it("should not add # for non-shared dice", () => {
		const result = extractAndMergeComments("2d6 # attack", "damage");

		expect(result.cleanedDice).toBe("2d6");
		expect(result.mergedComments?.startsWith("#")).toBe(false);
		expect(result.mergedComments).toBe("attack damage");
	});

	it("should handle dice message format extraction", () => {
		const result = extractAndMergeComments("attack 2d6 extra text");

		expect(result.cleanedDice).toBe("attack");
	});

	it("should handle empty user comments", () => {
		const result = extractAndMergeComments("2d6 # test", "");

		expect(result.cleanedDice).toBe("2d6");
		expect(result.mergedComments).toBe("test");
	});

	it("should strip # prefix from intermediate processing", () => {
		const result = extractAndMergeComments("2d6", "# user comment");

		expect(result.cleanedDice).toBe("2d6");
		expect(result.mergedComments).toBe("user comment");
	});

	it("should handle complex mixed comments", () => {
		const result = extractAndMergeComments(
			"2d6 %%[__strength__]%% # base attack",
			"critical hit"
		);

		expect(result.cleanedDice).toBe("2d6");
		expect(result.mergedComments).toContain("%%[__strength__]%%");
		expect(result.mergedComments).toContain("base attack");
		expect(result.mergedComments).toContain("critical hit");
	});

	it("should return undefined mergedComments when all empty", () => {
		const result = extractAndMergeComments("2d6", "");

		expect(result.cleanedDice).toBe("2d6");
		expect(result.mergedComments).toBeUndefined();
	});

	it("should handle whitespace in comments correctly", () => {
		const result = extractAndMergeComments("2d6 #   spaced   ", "  more  space  ");

		expect(result.cleanedDice).toBe("2d6");
		// Note: join(" ") preserves spaces between elements
		expect(result.mergedComments).toBe("spaced more  space");
	});

	it("should avoid duplicate tail and global comments", () => {
		// When tail comment equals global comment, should deduplicate
		const result = extractAndMergeComments("2d6 # test");

		expect(result.cleanedDice).toBe("2d6");
		// Should only appear once
		expect(result.mergedComments).toBe("test");
	});
});
