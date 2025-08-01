import type { DiceData } from "@dicelette/types";
import { describe, expect, it } from "vitest";
import {
	applyCommentsToResult,
	extractDiceData,
	hasValidDice,
	isRolling,
	performDiceRoll,
	processChainedComments,
} from "../src/dice_extractor";

describe("dice_extractor", () => {
	describe("extractDiceData", () => {
		it("should extract bracket roll from content", () => {
			const content = "[1d20] attack roll";
			const result = extractDiceData(content);

			expect(result.bracketRoll).toBe("1d20");
		});

		it("should extract comments from content", () => {
			const content = "1d20 attack roll";
			const result = extractDiceData(content);

			expect(result.comments).toBe("attack roll");
		});

		it("should extract dice value pattern", () => {
			const content = "d20 attack";
			const result = extractDiceData(content);

			expect(result.diceValue).toBeTruthy();
		});

		it("should handle content without dice patterns", () => {
			const content = "just a message";
			const result = extractDiceData(content);

			expect(result.bracketRoll).toBeUndefined();
			expect(result.comments).toBeDefined();
			expect(result.diceValue).toBeNull();
		});
	});

	describe("hasValidDice", () => {
		it("should return true when bracket roll is present", () => {
			const diceData: DiceData = {
				bracketRoll: "1d20",
				comments: undefined,
				diceValue: null,
			};

			expect(hasValidDice(diceData)).toBe(true);
		});

		it("should return true when comments and dice value are present", () => {
			const diceData: DiceData = {
				bracketRoll: undefined,
				comments: "attack roll",
				diceValue: ["d20"],
			};

			expect(hasValidDice(diceData)).toBe(true);
		});

		it("should return false when comments present but no dice value", () => {
			const diceData: DiceData = {
				bracketRoll: undefined,
				comments: "just a comment",
				diceValue: null,
			};

			expect(hasValidDice(diceData)).toBe(false);
		});

		it("should return true when no comments and no bracket roll", () => {
			const diceData: DiceData = {
				bracketRoll: undefined,
				comments: undefined,
				diceValue: null,
			};

			expect(hasValidDice(diceData)).toBe(true);
		});
	});

	describe("processChainedComments", () => {
		it("should not process bracketed comments with ampersand and semicolon", () => {
			const content = "1d20+5 # & something; [test comment]";
			const comments = "& something; [test comment]";

			const result = processChainedComments(content, comments);

			expect(result.content).toBe("1d20+5");
			expect(result.comments).toBe(comments);
		});

		it("should extract global comments starting with #", () => {
			const content = "[1d20+5] & something; # global comment";
			const comments = "[test comment]";

			const result = processChainedComments(content, comments);

			expect(result.content).toBe("[1d20+5] & something;");
			expect(result.comments).toBe("global comment");
		});

		it("should handle regular comments without brackets", () => {
			const content = "1d20 # regular comment";
			const comments = "initial comment";

			const result = processChainedComments(content, comments);

			expect(result.content).toBe("1d20");
			expect(result.comments).toBe("regular comment");
		});

		it("should fallback to original comments when no global comments found", () => {
			const content = "1d20 some text";
			const comments = "original comment";

			const result = processChainedComments(content, comments);

			expect(result.comments).toBe("original comment");
		});
	});

	describe("performDiceRoll", () => {
		it("should roll with bracket content when bracket roll is provided", () => {
			const result = performDiceRoll("some content", "1d20")?.resultat;

			expect(result).toBeDefined();
			expect(result!.dice).toBe("1d20");
			expect(result!.total).toBeGreaterThanOrEqual(1);
			expect(result!.total).toBeLessThanOrEqual(20);
		});

		it("should roll with trimmed content when no bracket roll", () => {
			const result = performDiceRoll("  1d20  ", undefined)?.resultat;

			expect(result).toBeDefined();
			expect(result!.dice).toBe("1d20");
			expect(result!.total).toBeGreaterThanOrEqual(1);
			expect(result!.total).toBeLessThanOrEqual(20);
		});

		it("should return undefined when roll throws an error", () => {
			const result = performDiceRoll("invalid", undefined);

			expect(result).toBeUndefined();
		});
	});

	describe("applyCommentsToResult", () => {
		it("should apply comments when no bracket roll", () => {
			const result = { dice: "1d20", result: "15" };
			const comments = "attack roll";

			const updatedResult = applyCommentsToResult(result, comments, undefined);

			expect(updatedResult.dice).toBe("1d20 /* attack roll */");
			expect(updatedResult.comment).toBe("attack roll");
		});

		it("should not apply comments when bracket roll is present", () => {
			const result = { dice: "1d20", result: "15" };
			const comments = "attack roll";

			const updatedResult = applyCommentsToResult(result, comments, "1d20");

			expect(updatedResult.dice).toBe("1d20");
			expect(updatedResult.comment).toBeUndefined();
		});

		it("should not apply comments when comments are undefined", () => {
			const result = { dice: "1d20", result: "15" };

			const updatedResult = applyCommentsToResult(result, undefined, undefined);

			expect(updatedResult.dice).toBe("1d20");
			expect(updatedResult.comment).toBeUndefined();
		});
	});

	describe("isRolling", () => {
		it("should return undefined for invalid dice content", () => {
			const content = "just a message";

			const result = isRolling(content);

			expect(result).toBeUndefined();
		});

		it("should successfully process bracket roll", () => {
			const content = "[1d20] attack roll";

			const result = isRolling(content);

			expect(result).toBeDefined();
			expect(result!.result).toBeDefined();
			expect(result!.result.dice).toBe("1d20");
			expect(result!.result.total).toBeGreaterThanOrEqual(1);
			expect(result!.result.total).toBeLessThanOrEqual(20);
			expect(result!.detectRoll).toBe("1d20");
		});

		it("should process regular dice with comments", () => {
			const content = "1d20 attack roll";

			const result = isRolling(content);

			expect(result).toBeDefined();
			expect(result!.result.dice).toBe("1d20 /* attack roll */");
			expect(result!.result.comment).toBe("attack roll");
			expect(result!.detectRoll).toBeUndefined();
		});

		it("should handle chained comments", () => {
			const content = "1d20;&+2 [something] #global comment";

			const result = isRolling(content);

			expect(result?.result).toBeDefined();
			expect(result!.result.comment).toBe("global comment");
		});

		it("should return undefined when roll fails and no bracket roll", () => {
			const content = "invalid dice expression";

			const result = isRolling(content);

			expect(result).toBeUndefined();
		});
	});
});
