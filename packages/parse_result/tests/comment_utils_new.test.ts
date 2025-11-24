import { describe, expect, it } from "vitest";
import { extractAndMergeComments } from "../src/comment_utils";

describe("extractAndMergeComments", () => {
	it("should extract comments from dice formula", () => {
		const result = extractAndMergeComments("2d6 # attack roll");
		expect(result.cleanedDice).toBe("2d6");
		expect(result.mergedComments).toBe("attack roll");
	});

	it("should merge user comments with formula comments", () => {
		const result = extractAndMergeComments("1d20 # skill check", "with advantage");
		expect(result.cleanedDice).toBe("1d20");
		expect(result.mergedComments).toContain("skill check");
		expect(result.mergedComments).toContain("with advantage");
	});

	it("should handle dice without comments", () => {
		const result = extractAndMergeComments("3d8+5");
		expect(result.cleanedDice).toBe("3d8+5");
		expect(result.mergedComments).toBeUndefined();
	});

	it("should handle shared dice notation (with semicolons)", () => {
		const result = extractAndMergeComments("2d6; 1d8 # damage");
		expect(result.cleanedDice).toContain("2d6");
		expect(result.cleanedDice).toContain("1d8");
		expect(result.mergedComments).toMatch(/^# /);
	});

	it("should remove stat markers from dice", () => {
		const result = extractAndMergeComments("1d20+%%[__strength__]%% # attack");
		expect(result.cleanedDice).not.toContain("%%");
		expect(result.cleanedDice).not.toContain("strength");
	});

	it("should preserve stat markers in comments", () => {
		const result = extractAndMergeComments("1d20+5 %%[__dexterity__]%% # test");
		expect(result.mergedComments).toContain("%%[__dexterity__]%%");
	});

	it("should deduplicate comments", () => {
		const result = extractAndMergeComments("1d20 # attack", "attack");
		const commentCount = (result.mergedComments?.match(/attack/g) || []).length;
		expect(commentCount).toBe(1);
	});

	it("should handle empty strings", () => {
		const result = extractAndMergeComments("");
		expect(result.cleanedDice).toBe("");
		expect(result.mergedComments).toBeUndefined();
	});

	it("should handle only user comments", () => {
		const result = extractAndMergeComments("1d20", "user comment");
		expect(result.cleanedDice).toBe("1d20");
		expect(result.mergedComments).toBe("user comment");
	});

	it("should extract all comments from formula", () => {
		const result = extractAndMergeComments("1d20 # attack # roll");
		expect(result.cleanedDice).toContain("1d20");
		expect(result.mergedComments).toBeTruthy();
		// La fonction peut conserver tous les commentaires
	});

	it("should handle multiple stat markers", () => {
		const result = extractAndMergeComments("1d20+%%[__str__]%% %%[__dex__]%% # test");
		expect(result.mergedComments).toContain("%%[__str__]%%");
		expect(result.mergedComments).toContain("%%[__dex__]%%");
	});

	it("should strip # prefix from merged comments when not shared", () => {
		const result = extractAndMergeComments("1d20 # comment");
		expect(result.mergedComments).toBe("comment");
		expect(result.mergedComments).not.toMatch(/^# /);
	});

	it("should add # prefix for shared dice", () => {
		const result = extractAndMergeComments("1d20; 2d6", "shared comment");
		expect(result.mergedComments).toMatch(/^# /);
	});

	it("should handle complex dice expressions", () => {
		const result = extractAndMergeComments("2d6+1d4+5 # complex roll");
		expect(result.cleanedDice).toContain("2d6");
		expect(result.cleanedDice).toContain("1d4");
		expect(result.cleanedDice).toContain("+5");
		expect(result.mergedComments).toBe("complex roll");
	});

	it("should handle bracketed comments in dice data", () => {
		const result = extractAndMergeComments("1d20 [saving throw]");
		expect(result.cleanedDice).toContain("1d20");
		// Bracketed comments are handled by extractDiceData
	});

	it("should clean multiple comment markers", () => {
		const result = extractAndMergeComments("1d20 # first # second");
		expect(result.cleanedDice).toBe("1d20");
		expect(result.mergedComments).toBeTruthy();
	});

	it("should handle whitespace-only comments", () => {
		const result = extractAndMergeComments("1d20 #   ");
		expect(result.cleanedDice).toBe("1d20");
	});

	it("should handle dice message format", () => {
		const result = extractAndMergeComments("strength 1d20+5");
		// Le format "strength 1d20+5" est traité comme un dice complet
		expect(result.cleanedDice).toBeTruthy();
		expect(result.cleanedDice.length).toBeGreaterThan(0);
	});

	it("should merge multiple unique comments", () => {
		const result = extractAndMergeComments("1d20 # attack", "with modifier");
		expect(result.mergedComments).toContain("attack");
		expect(result.mergedComments).toContain("with modifier");
	});

	it("should handle stat markers without duplicates", () => {
		const result = extractAndMergeComments(
			"1d20+%%[__strength__]%% # test %%[__strength__]%%"
		);
		const markerCount = (result.mergedComments?.match(/%%\[__strength__]%%/g) || [])
			.length;
		expect(markerCount).toBe(1);
	});

	it("should handle empty comments gracefully", () => {
		const result = extractAndMergeComments("1d20", "");
		expect(result.cleanedDice).toBe("1d20");
	});

	it("should trim all components properly", () => {
		const result = extractAndMergeComments("  1d20  # comment  ", "  user  ");
		expect(result.cleanedDice).toBe("1d20");
		expect(result.mergedComments).toContain("comment");
		expect(result.mergedComments).toContain("user");
	});
});

describe("extractAndMergeComments edge cases", () => {
	it("should handle only stat markers", () => {
		const result = extractAndMergeComments("1d20+%%[__str__]%%");
		expect(result.cleanedDice).toBe("1d20+");
		expect(result.mergedComments).toContain("%%[__str__]%%");
	});

	it("should handle mixed content with all features", () => {
		const result = extractAndMergeComments(
			"2d6; 1d8+%%[__str__]%% # damage roll",
			"critical hit"
		);
		expect(result.cleanedDice).toContain("2d6");
		expect(result.cleanedDice).toContain("1d8");
		expect(result.mergedComments).toContain("%%[__str__]%%");
		expect(result.mergedComments).toContain("damage roll");
		expect(result.mergedComments).toContain("critical hit");
		expect(result.mergedComments).toMatch(/^# /);
	});

	it("should handle multiple semicolons in shared dice", () => {
		const result = extractAndMergeComments("1d20; 2d6; 1d8 # multiple");
		expect(result.cleanedDice).toContain(";");
		expect(result.mergedComments).toMatch(/^# /);
	});
});
