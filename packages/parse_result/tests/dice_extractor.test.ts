import { DICE_COMPILED_PATTERNS } from "@dicelette/utils";
import { describe, expect, it } from "vitest";
import type { DiceData } from "../../types";
import { composeRollBase } from "../src/compose_roll";
import {
	applyCommentsToResult,
	applyCustomFormula,
	extractDiceData,
	getRoll,
	hasValidDice,
	isRolling,
	performDiceRoll,
	processChainedComments,
	replaceStatsInDiceFormula,
} from "../src/dice_extractor";
import { getExpression } from "../src/utils";

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

		it("should extract repeated dice pattern like 4#d10", () => {
			const content = "4#d10 attack roll";
			const result = extractDiceData(content);

			expect(result.diceValue).toBeTruthy();
			expect(result.diceValue?.[0]).toMatch(/\d+#d\d+/);
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
		it("should process bracketed comments with ampersand and semicolon", () => {
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

		it("should handle opposition rolls with comments", () => {
			const content = "1d20>10>5 # test comment";

			const result = isRolling(content);

			expect(result).toBeDefined();
			expect(result!.result.dice).toContain("1d20");
			expect(result!.result.dice).toContain(">10");
			expect(result!.result.compare).toBeDefined();
			expect(result!.result.compare?.sign).toBe(">");
			expect(result!.result.compare?.value).toBe(10);
			expect(result!.result.comment).toBe("test comment");
		});

		it("should handle opposition rolls with inline comments", () => {
			const content = "1d20>10>5 attack roll";

			const result = isRolling(content);

			expect(result).toBeDefined();
			expect(result!.result.dice).toContain("1d20");
			expect(result!.result.comment).toBe("attack roll");
		});

		it("should handle opposition rolls with complex dice and comments", () => {
			const content = "2d6+3>=15>=10 # damage roll";

			const result = isRolling(content);

			expect(result).toBeDefined();
			expect(result!.result.dice).toContain("2d6+3");
			expect(result!.result.comment).toBe("damage roll");
		});

		it("should handle opposition rolls with expression and inline comment", () => {
			const content = "1d20+5>12>8 critical strike";

			const result = isRolling(content);

			expect(result).toBeDefined();
			expect(result!.result.dice).toContain("1d20+5");
			expect(result!.result.comment).toBe("critical strike");
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

		it("should detect dice when custom critical blocks present", () => {
			const content = "1d100-99<50{cf:<=5}{cs:<=95}";

			const result = isRolling(content);

			expect(result).toBeDefined();
			expect(result!.result).toBeDefined();
			expect(result!.result.dice).toContain("1d100");
		});

		it("should recognize repeated dice notation like 4#d10", () => {
			const content = "4#d10 attack roll";

			const result = isRolling(content);

			expect(result).toBeDefined();
			expect(result!.result).toBeDefined();
			// The dice parser processes 4#d10 into multiple d10 rolls
			// Check that the result contains multiple d10 rolls
			expect(result!.result.result).toContain("d10:");
			expect(result!.result.comment).toBe("attack roll");
		});
	});

	describe("replaceStatsInDiceFormula", () => {
		it("should replace stat variables in formula", () => {
			const content = "1d100+$dext";
			const stats = { dext: 40 };

			const result = replaceStatsInDiceFormula(content, stats);

			expect(result.formula).toContain("1d100+40");
			expect(result.infoRoll).toBe("Dext");
		});

		it("should track stats per segment for shared rolls", () => {
			const content = "1d100+$dext;&+$force";
			const stats = { dext: 40, force: 5 };

			const result = replaceStatsInDiceFormula(content, stats);

			expect(result.formula).toContain("1d100+40;&+5");
			expect(result.statsPerSegment).toBeDefined();
			expect(result.statsPerSegment).toHaveLength(2);
			expect(result.statsPerSegment![0]).toBe("Dext");
			expect(result.statsPerSegment![1]).toBe("Force");
		});

		it("should return undefined statsPerSegment for non-shared rolls", () => {
			const content = "1d100+$dext";
			const stats = { dext: 40 };

			const result = replaceStatsInDiceFormula(content, stats);

			expect(result.statsPerSegment).toBeUndefined();
		});

		it("should handle shared rolls with only one stat", () => {
			const content = "1d100+$dext;&+5";
			const stats = { dext: 40 };

			const result = replaceStatsInDiceFormula(content, stats);

			expect(result.formula).toContain("1d100+40;&+5");
			expect(result.statsPerSegment).toBeDefined();
			expect(result.statsPerSegment).toHaveLength(2);
			expect(result.statsPerSegment![0]).toBe("Dext");
			expect(result.statsPerSegment![1]).toBe(""); // No stat for second segment
		});

		it("should handle shared rolls with multiple segments", () => {
			const content = "1d100+$str;&+$dex;&+$con";
			const stats = { con: 12, dex: 15, str: 10 };

			const result = replaceStatsInDiceFormula(content, stats);

			expect(result.formula).toContain("1d100+10;&+15;&+12");
			expect(result.statsPerSegment).toHaveLength(3);
			expect(result.statsPerSegment![0]).toBe("Str");
			expect(result.statsPerSegment![1]).toBe("Dex");
			expect(result.statsPerSegment![2]).toBe("Con");
		});

		it("should join multiple stats in the same segment with ×", () => {
			const content = "1d100<=$dext+$prec;&+[$dext+$prec]";
			const stats = { dext: 20, prec: 40 };

			const result = replaceStatsInDiceFormula(content, stats);

			expect(result.statsPerSegment).toHaveLength(2);
			expect(result.statsPerSegment![0]).toBe("Dext × Prec");
			expect(result.statsPerSegment![1]).toBe("Dext × Prec");
		});

		it("should preserve parentheses when replacing stats inside them", () => {
			const content = "1d($s1+$s2)";
			const stats = { s1: 5, s2: 10 };

			const result = replaceStatsInDiceFormula(content, stats);

			expect(result.formula).toContain("1d(5+10)");
		});

		it("should replace 3 stat variables in a single non-shared formula", () => {
			const content = "1d10+$S1+$S2+$S3";
			const stats = { S1: 5, S2: 10, S3: 15 };

			const result = replaceStatsInDiceFormula(content, stats);

			expect(result.formula).toContain("1d10+5+10+15");
			expect(result.formula).toContain("S1");
			expect(result.formula).toContain("S2");
			expect(result.formula).toContain("S3");
		});
	});

	describe("applyCustomFormula", () => {
		const formula = "$>=85?85+floor(($-85)/5):$";

		it("should replace [numeric value] with the formula applied to that value", () => {
			const result = applyCustomFormula("1d100<=[90]", formula);
			expect(result).toBe("1d100<={{(90)>=85?85+floor(((90)-85)/5):(90)}}");
		});

		it("should leave plain text comments like [attack roll] untouched", () => {
			const result = applyCustomFormula("1d20 [attack roll]", formula);
			expect(result).toBe("1d20 [attack roll]");
		});

		it("should replace [$ stat reference] with the formula applied to that expression", () => {
			const result = applyCustomFormula("1d100<=[$dex]", formula);
			expect(result).toBe("1d100<={{($dex)>=85?85+floor((($dex)-85)/5):($dex)}}");
		});

		it("should replace multiple [expr] in the same dice string", () => {
			const simpleFormula = "$*2";
			const result = applyCustomFormula("1d100<=[40];&+[10]", simpleFormula);
			expect(result).toBe("1d100<={{(40)*2}};&+{{(10)*2}}");
		});

		it("should replace [math expression] like [40+5] with the formula applied", () => {
			const simpleFormula = "$+1";
			const result = applyCustomFormula("1d100<=[40+5]", simpleFormula);
			expect(result).toBe("1d100<={{(40+5)+1}}");
		});

		it("should produce a rollable dice after formula application with a numeric value", () => {
			const simpleFormula = "$";
			const dice = applyCustomFormula("1d100<=[60]", simpleFormula);
			// {{(60)}} evaluates to 60, so the roll is 1d100<=60
			const result = getRoll(dice);
			expect(result).toBeDefined();
			expect(result!.total).toBeGreaterThanOrEqual(1);
			expect(result!.total).toBeLessThanOrEqual(100);
			expect(result!.compare).toBeDefined();
			expect(result!.compare!.sign).toBe("<=");
			expect(result!.compare!.value).toBe(60);
		});

		it("should produce a rollable dice after formula application with a math expression", () => {
			const simpleFormula = "floor($)";
			const dice = applyCustomFormula("1d20+[5+3]", simpleFormula);
			// {{floor((5+3))}} evaluates to 8, so the roll is 1d20+8
			const result = getRoll(dice);
			expect(result).toBeDefined();
			expect(result!.total).toBeGreaterThanOrEqual(9);
			expect(result!.total).toBeLessThanOrEqual(28);
		});

		it("should not replace [expr] that is a plain word (no $ or math only)", () => {
			const result = applyCustomFormula("1d6 [fire damage]", formula);
			expect(result).toBe("1d6 [fire damage]");
		});

		it("getRoll: formula with {cs} in true branch rolls when stat >= threshold", () => {
			// formula: $>=85?69{cs:<=5+($-85)}:$  — stat=90, condition true
			const dice = applyCustomFormula("1d100<=[90]", "$>=85?69{cs:<=5+($-85)}:$");
			// {{(90)>=85?69{cs:<=5+((90)-85)}:(90)}} → 69{cs:<=10} → 1d100<=69{cs:<=10}
			const result = getRoll(dice);
			expect(result).toBeDefined();
			expect(result!.compare).toBeDefined();
			expect(result!.compare!.sign).toBe("<=");
			expect(result!.compare!.value).toBe(69);
		});

		it("getRoll: formula with {cs} in false branch keeps plain threshold", () => {
			// formula: $>=85?69{cs:<=5+($-85)}:$  — stat=50, condition false
			const dice = applyCustomFormula("1d100<=[50]", "$>=85?69{cs:<=5+($-85)}:$");
			// {{(50)>=85?69{cs:<=5+((50)-85)}:(50)}} → 50{cs:<=-30} → 1d100<=50
			const result = getRoll(dice);
			expect(result).toBeDefined();
			expect(result!.compare).toBeDefined();
			expect(result!.compare!.sign).toBe("<=");
			expect(result!.compare!.value).toBe(50);
		});
	});
});

describe("applyCustomFormula", () => {
	describe("bracket expressions with $ or math — existing behaviour", () => {
		it("wraps a dollar stat reference in the formula", () => {
			const result = applyCustomFormula("1d100<=[$dex]", "$");
			expect(result).toBe("1d100<={{($dex)}}");
		});

		it("wraps a pure-math bracket expression in the formula", () => {
			const result = applyCustomFormula("1d100<=[50+10]", "$>=85?85:$");
			expect(result).toBe("1d100<={{(50+10)>=85?85:(50+10)}}");
		});

		it("leaves a plain-text comment bracket untouched", () => {
			const result = applyCustomFormula("1d20 [attack roll]", "$*2");
			expect(result).toBe("1d20 [attack roll]");
		});

		it("leaves a bracket with unrecognised content untouched", () => {
			const result = applyCustomFormula("1d20 [some label here]", "$*2");
			expect(result).toBe("1d20 [some label here]");
		});
	});

	describe("bracket expressions with dice notation — new behaviour", () => {
		it("wraps a simple dice expression [1d6] in the formula", () => {
			const result = applyCustomFormula("1d100<=[1d6]", "$");
			expect(result).toBe("1d100<={{(1d6)}}");
		});

		it("wraps a complex dice expression [2d10+3] in the formula", () => {
			const result = applyCustomFormula("1d100<=[2d10+3]", "$*2");
			expect(result).toBe("1d100<={{(2d10+3)*2}}");
		});

		it("wraps a bare die [d20] in the formula", () => {
			const result = applyCustomFormula("1d100<=[d20]", "$");
			expect(result).toBe("1d100<={{(d20)}}");
		});

		it("wraps dice bracket inside a conditional formula", () => {
			const result = applyCustomFormula("1d100<=[1d6]", "$>3?$*2:$");
			expect(result).toBe("1d100<={{(1d6)>3?(1d6)*2:(1d6)}}");
		});
	});

	describe("integration: isRolling after applyCustomFormula with dice in bracket", () => {
		it("evaluates [1d6] bracket and produces a comparison in range [1,6]", () => {
			// formula "$" simply evaluates the bracket expression as-is
			const prepared = applyCustomFormula("1d100<=[1d6]", "$");
			// prepared = "1d100<={{(1d6)}}"
			const result = isRolling(prepared);
			expect(result).toBeDefined();
			expect(result!.result.compare).toBeDefined();
			expect(result!.result.compare!.sign).toBe("<=");
			const cmp = result!.result.compare!.value;
			expect(cmp).toBeGreaterThanOrEqual(1);
			expect(cmp).toBeLessThanOrEqual(6);
		});

		it("evaluates custom formula with dice in true branch when stat > threshold", () => {
			// formula "$>85?1d10+$:$", bracket [90] → true branch: 1d10+90 ∈ [91,100]
			const prepared = applyCustomFormula("1d100<=[90]", "$>85?1d10+$:$");
			// prepared = "1d100<={{(90)>85?1d10+(90):(90)}}"
			const result = isRolling(prepared);
			expect(result).toBeDefined();
			expect(result!.result.compare).toBeDefined();
			expect(result!.result.compare!.sign).toBe("<=");
			const cmp = result!.result.compare!.value;
			expect(cmp).toBeGreaterThanOrEqual(91);
			expect(cmp).toBeLessThanOrEqual(100);
		});

		it("evaluates custom formula with dice — false branch when stat <= threshold", () => {
			// formula "$>85?1d10+$:$", bracket [70] → false branch: 70
			const prepared = applyCustomFormula("1d100<=[70]", "$>85?1d10+$:$");
			// prepared = "1d100<={{(70)>85?1d10+(70):(70)}}"
			const result = isRolling(prepared);
			expect(result).toBeDefined();
			expect(result!.result.compare).toBeDefined();
			expect(result!.result.compare!.value).toBe(70);
		});
	});

	describe("free-text pipeline: {exp} macro inside a custom-formula bracket", () => {
		// Mirrors on_message_send.ts / the web Playground: no interactive "expression"
		// option exists, so `{exp}` is resolved via getExpression(content, "0") before
		// applyCustomFormula runs — otherwise the literal "{exp||X}" text fails
		// isFormulaExpression's check and the bracket is left untouched.
		it("leaves the bracket untouched (and unrollable) without the getExpression pre-pass", () => {
			const raw = applyCustomFormula("1d100<=[{exp||10}]", "$>=85?85:$");
			expect(raw).toBe("1d100<=[{exp||10}]");
		});

		it("resolves the exp default then applies the custom formula", () => {
			const resolved = getExpression("1d100<=[{exp||10}]", "0").dice;
			expect(resolved).toBe("1d100<=[10]");
			const prepared = applyCustomFormula(resolved, "$>=85?85:$");
			expect(prepared).toBe("1d100<={{(10)>=85?85:(10)}}");
			const result = isRolling(prepared);
			expect(result?.result.compare).toEqual({ sign: "<=", value: 10 });
		});

		it("resolves a bare {exp} (no default) to 1 before applying the formula", () => {
			const resolved = getExpression("1d100<=[{exp}]", "0").dice;
			expect(resolved).toBe("1d100<=[1]");
			const prepared = applyCustomFormula(resolved, "$*2");
			expect(prepared).toBe("1d100<={{(1)*2}}");
		});
	});

	describe("interaction pipeline: [$stat] bracket without a custom formula configured", () => {
		// Mirrors snippets.ts + rollWithInteraction (roll.ts): getExpression, then
		// composeRollBase (which resolves $stat everywhere, brackets included),
		// then applyCustomFormula with the identity formula "$" as a fallback when
		// no real custom formula is configured. Without that fallback, `[75]`
		// would reach the roll engine as literal bracket text — read as mathjs
		// array syntax instead of a grouped number, breaking the comparator.
		it("resolves stats inside the bracket and rolls with the right threshold", () => {
			const stats = { res_physique: 10, vita: 40, volo: 25 };
			const raw = "1d100<=[$vita+$volo+$res_physique]";
			const expr = getExpression(raw, "0");
			const composed = composeRollBase(
				expr.dice,
				undefined,
				DICE_COMPILED_PATTERNS.COMPARATOR,
				stats,
				undefined,
				expr.expressionStr,
				""
			);
			expect(composed.roll).toBe("1d100<=[40+25+10]");

			// rollWithInteraction always calls applyCustomFormula, defaulting to "$"
			// (identity) when resolveCustomFormula() returns nothing.
			const finalDice = applyCustomFormula(composed.roll, "$");
			expect(finalDice).toBe("1d100<={{(40+25+10)}}");

			const result = getRoll(finalDice);
			expect(result?.compare).toEqual({ sign: "<=", value: 75 });
		});
	});
});
