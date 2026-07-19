import { describe, expect, it } from "vitest";
import type { UserData } from "../../types";
import {
	applyCustomFormula,
	applySemiDirectCustomFormula,
	getRoll,
	isRolling,
} from "../src/dice_extractor";
import { isNotADice } from "../src/utils";

/** Build a minimal UserData carrying only the stats map. */
function withStats(stats: Record<string, number>): UserData {
	return { stats, template: {} };
}

const STATS = { dexterite: 40, force: 10, prec: 20 };
const STATS_NAME = ["Force", "Dextérité", "Prec"];

describe("roll parsing — basic rolls", () => {
	it("rolls a simple die in range", () => {
		const r = isRolling("1d20");
		expect(r).toBeDefined();
		expect(r!.result.dice).toBe("1d20");
		expect(r!.result.total).toBeGreaterThanOrEqual(1);
		expect(r!.result.total).toBeLessThanOrEqual(20);
		expect(r!.result.compare).toBeUndefined();
	});

	it("applies an additive modifier", () => {
		const r = isRolling("1d20+5");
		expect(r!.result.dice).toBe("1d20+5");
		expect(r!.result.modifier).toEqual({ sign: "+", value: 5 });
		expect(r!.result.total).toBeGreaterThanOrEqual(6);
		expect(r!.result.total).toBeLessThanOrEqual(25);
	});

	it("evaluates a math expression with parentheses", () => {
		const r = isRolling("(1d6+2)*3");
		expect(r!.result.dice).toBe("(1d6+2)*3");
		expect(r!.result.total).toBeGreaterThanOrEqual(9); // (1+2)*3
		expect(r!.result.total).toBeLessThanOrEqual(24); // (6+2)*3
	});

	it("resolves a dynamic dice face like 1d(2+4)", () => {
		const r = isRolling("1d(2+4)");
		expect(r!.result.dice).toBe("1d(2+4)");
		expect(r!.result.total).toBeGreaterThanOrEqual(1);
		expect(r!.result.total).toBeLessThanOrEqual(6);
	});

	it("returns undefined for non-dice content", () => {
		expect(isRolling("just a message")).toBeUndefined();
	});
});

describe("roll parsing — dice-roller notation", () => {
	it("supports exploding dice (4d6!)", () => {
		const r = isRolling("4d6!");
		expect(r).toBeDefined();
		expect(r!.result.dice).toBe("4d6!");
		// Exploding can exceed the naive max, but stays well-formed.
		expect(r!.result.total).toBeGreaterThanOrEqual(4);
	});

	it("supports keep-highest (4d6kh3)", () => {
		const r = isRolling("4d6kh3");
		expect(r).toBeDefined();
		expect(r!.result.dice).toBe("4d6kh3");
		expect(r!.result.total).toBeGreaterThanOrEqual(3);
		expect(r!.result.total).toBeLessThanOrEqual(18);
	});

	it("supports percentile dice (1d%)", () => {
		const r = isRolling("1d%");
		expect(r).toBeDefined();
		expect(r!.result.total).toBeGreaterThanOrEqual(1);
		expect(r!.result.total).toBeLessThanOrEqual(100);
	});
});

describe("roll parsing — comments", () => {
	it("extracts a # comment without keeping it in the dice", () => {
		const r = isRolling("1d20 # my comment");
		expect(r!.result.comment).toBe("my comment");
		expect(r!.result.dice).toBe("1d20");
	});

	it("keeps an inline (//) comment attached as a /* */ block", () => {
		const r = isRolling("1d6 // attack damage");
		expect(r!.result.comment).toBe("// attack damage");
		expect(r!.result.dice).toContain("1d6");
	});

	it("treats a trailing text as an inline comment", () => {
		const r = isRolling("1d20 attack roll");
		expect(r!.result.comment).toBe("attack roll");
		expect(r!.result.dice).toBe("1d20 /* attack roll */");
	});

	it("uses an explicit bracket roll and ignores trailing label", () => {
		const r = isRolling("[1d20] attack roll");
		expect(r!.detectRoll).toBe("1d20");
		expect(r!.result.dice).toBe("1d20");
	});
});

describe("roll parsing — comparison & opposition", () => {
	it("captures a single comparator", () => {
		const r = isRolling("1d20>=15");
		expect(r!.result.compare).toEqual({ sign: ">=", value: 15 });
		expect(r!.result.dice).toBe("1d20");
	});

	it("keeps only the first comparator on an opposition roll", () => {
		const r = isRolling("1d20>=15>=10");
		expect(r!.result.compare).toEqual({ sign: ">=", value: 15 });
		// The opposition (>=10) must not leak into the rolled dice.
		expect(r!.result.dice).not.toContain(">=10");
	});

	it("keeps the comparator and the # comment together", () => {
		const r = isRolling("1d20>=15 # note");
		expect(r!.result.compare).toEqual({ sign: ">=", value: 15 });
		expect(r!.result.comment).toBe("note");
	});

	it("handles a complex dice with opposition and an inline comment", () => {
		const r = isRolling("2d6+3>=15>=10 damage");
		expect(r!.result.dice).toContain("2d6+3");
		expect(r!.result.compare?.sign).toBe(">=");
		expect(r!.result.compare?.value).toBe(15);
		expect(r!.result.comment).toBe("damage");
	});
});

describe("roll parsing — bulk rolls", () => {
	it("rolls N independent dice (4#d10)", () => {
		const r = isRolling("4#d10");
		expect(r!.result.dice).toBe("4#d10");
		const segments = r!.result.result.split(";");
		expect(segments).toHaveLength(4);
		for (const seg of segments) expect(seg).toContain("d10:");
	});

	it("keeps the comparator and counts successes as total (5#d100<=60)", () => {
		const r = isRolling("5#d100<=60");
		expect(r!.result.dice).toBe("5#d100<=60");
		expect(r!.result.compare).toEqual({ sign: "<=", value: 60 });
		// total is the number of successful dice (0..5)
		expect(r!.result.total).toBeGreaterThanOrEqual(0);
		expect(r!.result.total).toBeLessThanOrEqual(5);
		expect(r!.result.result.split(";")).toHaveLength(5);
	});

	it("extracts a comment from a bulk roll (3#1d20 # bulk)", () => {
		const r = isRolling("3#1d20 # bulk");
		expect(r!.result.dice).toBe("3#1d20");
		expect(r!.result.comment).toBe("bulk");
		expect(r!.result.result.split(";")).toHaveLength(3);
	});

	it("substitutes a stat inside a bulk comparison (3#1d100<=$dexterite)", () => {
		const r = isRolling("3#1d100<=$dexterite", withStats(STATS), STATS_NAME);
		expect(r!.result.dice).toBe("3#1d100<=40");
		expect(r!.result.compare).toEqual({ sign: "<=", value: 40 });
		expect(r!.infoRoll).toBe("Dextérité");
		expect(r!.result.result.split(";")).toHaveLength(3);
	});
});

describe("roll parsing — shared (unique) rolls", () => {
	it("reuses the first roll in the second segment (1d6;&+10)", () => {
		const r = isRolling("1d6;&+10");
		expect(r!.result.dice).toBe("1d6;&+10");
		// ※ marks the base roll, ◈ marks the reuse segment.
		expect(r!.result.result).toContain("※");
		expect(r!.result.result).toContain("◈");
		expect(r!.result.result).toContain("[1d6]+10");
	});

	it("keeps the comparison on the base segment of a shared roll", () => {
		const r = isRolling("1d100<=60;&+5");
		expect(r!.result.dice).toBe("1d100<=60;&+5");
		expect(r!.result.compare).toEqual({ sign: "<=", value: 60 });
	});

	it("tracks one stat per segment in a shared roll", () => {
		const r = isRolling("1d100+$force;&+$dexterite", withStats(STATS), STATS_NAME);
		expect(r!.result.dice).toBe("1d100+10;&+40");
		expect(r!.statsPerSegment).toEqual(["Force", "Dextérité"]);
		expect(r!.infoRoll).toBe("Force × Dextérité");
	});

	it("extracts a # comment from a shared roll", () => {
		const r = isRolling("1d6;&+10 # note");
		expect(r!.result.dice).toBe("1d6;&+10");
		expect(r!.result.comment).toBe("note");
	});

	it("supports a per-segment opposition comparator (1d6;&+2>5)", () => {
		const r = isRolling("1d6;&+2>5");
		expect(r!.result.dice).toBe("1d6;&+2>5");
		expect(r!.result.compare).toEqual({ sign: ">", value: 5 });
		expect(r!.result.result).toContain("※");
	});

	it("getRoll handles a shared roll directly", () => {
		const r = getRoll("1d6;&+10");
		expect(r).toBeDefined();
		expect(r!.dice).toBe("1d6;&+10");
		expect(r!.result).toContain("◈");
	});
});

describe("roll parsing — inline custom critical blocks", () => {
	it("strips {cs:} before rolling but keeps the comparator", () => {
		const r = isRolling("1d20{cs:>=18}>=20");
		expect(r!.result.dice).toBe("1d20");
		expect(r!.result.compare).toEqual({ sign: ">=", value: 20 });
	});

	it("strips both {cf:} and {cs:} blocks", () => {
		const r = isRolling("1d100<50{cf:<=5}{cs:<=95}");
		expect(r!.result.dice).toBe("1d100");
		expect(r!.result.compare?.sign).toBe("<");
		expect(r!.result.compare?.value).toBe(50);
	});
});

describe("roll parsing — stat substitution", () => {
	it("substitutes a single stat and records the info marker", () => {
		const r = isRolling("1d100+$force", withStats(STATS), STATS_NAME);
		expect(r!.result.dice).toContain("1d100+10");
		expect(r!.result.comment).toContain("__Force__");
	});

	it("substitutes a stat inside a comparator", () => {
		const r = isRolling("1d100<=$dexterite", withStats(STATS), STATS_NAME);
		expect(r!.result.compare).toEqual({ sign: "<=", value: 40 });
	});

	it("joins multiple stats with × in a comparator", () => {
		const r = isRolling("1d100<=$dexterite+$prec", withStats(STATS), STATS_NAME);
		expect(r!.result.compare?.sign).toBe("<=");
		expect(r!.result.compare?.value).toBe(60);
		expect(r!.result.comment).toContain("__Dextérité × Prec__");
	});

	it("matches a stat partially ($dex → Dextérité)", () => {
		const r = isRolling("1d20+$dex", withStats(STATS), STATS_NAME);
		expect(r!.result.dice).toContain("1d20+40");
		expect(r!.result.comment).toContain("__Dextérité__");
	});

	it("removes an unknown stat when replaceUnknown is provided", () => {
		const r = isRolling(
			"1d20+$unknownstat",
			withStats(STATS),
			STATS_NAME,
			undefined,
			undefined,
			undefined,
			undefined,
			"0"
		);
		expect(r).toBeDefined();
		expect(r!.result.dice).toBe("1d20");
		expect(r!.result.total).toBeGreaterThanOrEqual(1);
		expect(r!.result.total).toBeLessThanOrEqual(20);
	});
});

describe("roll parsing — disableCompare", () => {
	it("wraps a simple comparison and inlines the boolean result", () => {
		const r = isRolling("1d20>=15", undefined, undefined, undefined, true);
		expect(r!.result.dice).toBe("{1d20>=15}");
		// The comparator is evaluated inline; no separate compare object is exposed.
		expect(r!.result.compare).toBeUndefined();
		expect(r!.result.result).toContain("1d20>=15");
		expect([0, 1]).toContain(r!.result.total);
	});

	it("wraps an opposition roll keeping only the first comparator", () => {
		const r = isRolling("1d20>=15>=10", undefined, undefined, undefined, true);
		expect(r!.result.dice).toBe("{1d20>=15}");
		expect(r!.result.compare).toBeUndefined();
	});

	it("wraps a comparison while substituting a stat", () => {
		const r = isRolling(
			"1d100<=$dexterite",
			withStats(STATS),
			STATS_NAME,
			undefined,
			true
		);
		expect(r!.result.dice).toContain("{1d100<=40}");
		expect(r!.result.compare).toBeUndefined();
		expect(r!.result.comment).toContain("__Dextérité__");
	});

	it("wraps a comparison and keeps the # comment", () => {
		const r = isRolling("1d20>=15 # note", undefined, undefined, undefined, true);
		expect(r!.result.dice).toContain("{1d20>=15}");
		expect(r!.result.comment).toBe("note");
	});

	it("wraps a bulk comparison evaluating each die inline", () => {
		const r = isRolling("5#d100<=60", undefined, undefined, undefined, true);
		expect(r!.result.dice).toBe("{5#d100<=60}");
		expect(r!.result.compare).toBeUndefined();
		expect(r!.result.result.split(";")).toHaveLength(5);
		// total is the count of successful dice (0..5)
		expect(r!.result.total).toBeGreaterThanOrEqual(0);
		expect(r!.result.total).toBeLessThanOrEqual(5);
	});

	it("wraps a shared roll", () => {
		const r = isRolling("1d100<=60;&+5", undefined, undefined, undefined, true);
		expect(r!.result.dice).toBe("{1d100<=60;&+5}");
		expect(r!.result.result).toContain("◈");
	});

	it("does not affect a plain roll without comparison", () => {
		const r = isRolling("1d20+5", undefined, undefined, undefined, true);
		expect(r!.result.dice).toBe("{1d20+5}");
		expect(r!.result.total).toBeGreaterThanOrEqual(6);
		expect(r!.result.total).toBeLessThanOrEqual(25);
	});

	it("adds x marker on die when the natural die itself passes the threshold", () => {
		// 1d20+5>=1: any d20 value (1–20) is itself >= 1, so x always appears
		const r = isRolling("1d20+5>=1", undefined, undefined, undefined, true);
		expect(r!.result.total).toBe(1);
		expect(r!.result.result).toMatch(/\[\d+×/);
	});

	it("does not add x marker when no individual die reaches the threshold", () => {
		// 1d20+5>=100: no d20 value reaches 100, so x never appears (even though
		// +5 could push the total over a lower threshold; this tests the no-x case)
		const r = isRolling("1d20+5>=100", undefined, undefined, undefined, true);
		expect(r!.result.total).toBe(0);
		expect(r!.result.result).not.toMatch(/\[\d+×/);
	});

	it("does not add x when die passes only via modifier, not naturally", () => {
		// 1d6+10>=15: d6 max is 6, so no die is naturally >= 15, but total may be
		// >= 15 (e.g. 6+10=16). x must NOT appear on the die.
		const r = isRolling("1d6+10>=15", undefined, undefined, undefined, true);
		// total is 1 when d6 roll + 10 >= 15, i.e. d6 >= 5
		expect(r!.result.result).not.toMatch(/\[\d+×/);
	});
});

describe("roll parsing — custom formula", () => {
	it("evaluates a numeric bracket through the formula", () => {
		const dice = applyCustomFormula("1d100<=[90]", "$>=85?85:$");
		expect(dice).toBe("1d100<={{(90)>=85?85:(90)}}");
		const r = isRolling(dice);
		expect(r!.result.compare).toEqual({ sign: "<=", value: 85 });
	});

	it("evaluates the false branch of a conditional formula", () => {
		const dice = applyCustomFormula("1d100<=[50]", "$>=85?85:$");
		const r = isRolling(dice);
		expect(r!.result.compare).toEqual({ sign: "<=", value: 50 });
	});

	it("rolls dice nested in a bracket expression ([1d6])", () => {
		const dice = applyCustomFormula("1d100<=[1d6]", "$");
		expect(dice).toBe("1d100<={{(1d6)}}");
		const r = isRolling(dice);
		expect(r!.result.compare?.sign).toBe("<=");
		expect(r!.result.compare!.value).toBeGreaterThanOrEqual(1);
		expect(r!.result.compare!.value).toBeLessThanOrEqual(6);
	});

	it("applies a formula across each segment of a shared roll", () => {
		const dice = applyCustomFormula("1d100<=[40];&+[10]", "$*2");
		expect(dice).toBe("1d100<={{(40)*2}};&+{{(10)*2}}");
		const r = isRolling(dice);
		expect(r!.result.dice).toBe("1d100<=80;&+20");
		expect(r!.result.compare).toEqual({ sign: "<=", value: 80 });
	});

	it("applies a formula to every die of a bulk roll", () => {
		const dice = applyCustomFormula("3#1d100<=[40]", "$");
		expect(dice).toBe("3#1d100<={{(40)}}");
		const r = isRolling(dice);
		expect(r!.result.dice).toBe("3#1d100<=40");
		expect(r!.result.compare).toEqual({ sign: "<=", value: 40 });
		expect(r!.result.result.split(";")).toHaveLength(3);
	});

	it("leaves a plain-text bracket label untouched", () => {
		const dice = applyCustomFormula("1d20 [attack roll]", "$*2");
		expect(dice).toBe("1d20 [attack roll]");
		const r = isRolling(dice);
		// The label is not a formula, so it is treated as an inline comment.
		expect(r!.result.dice).toBe("1d20 /* [attack roll] */");
		expect(r!.result.comment).toBe("[attack roll]");
	});
});

describe("roll parsing — disableCompare + custom formula", () => {
	it("wraps the formula result and inlines the comparison", () => {
		const dice = applyCustomFormula("1d100<=[90]", "$>=85?85:$");
		const r = isRolling(dice, undefined, undefined, undefined, true);
		expect(r!.result.dice).toBe("{1d100<=85}");
		expect(r!.result.compare).toBeUndefined();
		expect([0, 1]).toContain(r!.result.total);
	});

	it("wraps a stat-backed bracket formula and inlines the comparison", () => {
		const dice = applyCustomFormula("1d100<=[$dexterite]", "$");
		expect(dice).toBe("1d100<={{($dexterite)}}");
		const r = isRolling(dice, withStats(STATS), STATS_NAME, undefined, true);
		expect(r!.result.dice).toContain("{1d100<=40}");
		expect(r!.result.compare).toBeUndefined();
		expect(r!.result.comment).toContain("__Dextérité__");
	});

	it("evaluates a math bracket formula and inlines the comparison", () => {
		const dice = applyCustomFormula("1d100<=[40+5]", "$+1");
		expect(dice).toBe("1d100<={{(40+5)+1}}");
		const r = isRolling(dice, undefined, undefined, undefined, true);
		// {{(40+5)+1}} = 46
		expect(r!.result.dice).toBe("{1d100<=46}");
		expect(r!.result.compare).toBeUndefined();
	});
});

describe("roll parsing — conditional custom formula with $stat (regression)", () => {
	// A comparison operator inside a {{...}} block must NOT be treated as an
	// opposition comparator, even when the block still carries an unresolved $stat
	// at opposition-detection time (it can only be evaluated after substitution).

	it("resolves the false branch of a conditional formula fed by a stat", () => {
		// dexterite=40 < 85 → false branch → {{(40)>=85?85:(40)}} = 40
		const dice = applyCustomFormula("1d100<=[$dexterite]", "$>=85?85:$");
		expect(dice).toBe("1d100<={{($dexterite)>=85?85:($dexterite)}}");
		const r = isRolling(dice, withStats(STATS), STATS_NAME);
		expect(r!.result.compare).toEqual({ sign: "<=", value: 40 });
		expect(r!.result.comment).toContain("__Dextérité__");
	});

	it("resolves the true branch of a conditional formula fed by a stat", () => {
		// dexterite=40 >= 30 → true branch → 99
		const dice = applyCustomFormula("1d100<=[$dexterite]", "$>=30?99:$");
		const r = isRolling(dice, withStats(STATS), STATS_NAME);
		expect(r!.result.compare).toEqual({ sign: "<=", value: 99 });
	});

	it("handles a real opposition outside a stat-backed formula block", () => {
		const dice = applyCustomFormula("1d100<=[$dexterite]>=10", "$");
		expect(dice).toBe("1d100<={{($dexterite)}}>=10");
		const r = isRolling(dice, withStats(STATS), STATS_NAME);
		expect(r!.result.compare).toEqual({ sign: "<=", value: 40 });
		expect(r!.result.dice).not.toContain(">=10");
	});

	it("works with disableCompare on a conditional stat formula", () => {
		const dice = applyCustomFormula("1d100<=[$dexterite]", "$>=85?85:$");
		const r = isRolling(dice, withStats(STATS), STATS_NAME, undefined, true);
		expect(r!.result.dice).toContain("{1d100<=40}");
		expect(r!.result.compare).toBeUndefined();
		expect([0, 1]).toContain(r!.result.total);
	});
});

describe("roll parsing — mixed syntaxes", () => {
	it("modifier + comparison + comment", () => {
		const r = isRolling("2d6+3>=15 # damage");
		expect(r!.result.dice).toBe("2d6+3>=15");
		expect(r!.result.compare).toEqual({ sign: ">=", value: 15 });
		expect(r!.result.comment).toBe("damage");
	});

	it("formula block {{}} as a modifier", () => {
		const r = isRolling("1d20+{{2*3}}");
		expect(r!.result.dice).toBe("1d20+6");
		expect(r!.result.modifier).toEqual({ sign: "+", value: 6 });
	});

	it("formula block {{}} as a comparator value", () => {
		const r = isRolling("1d100<={{50+10}}");
		expect(r!.result.compare).toEqual({ sign: "<=", value: 60 });
	});

	it("stat substitution inside a shared roll with one anonymous segment", () => {
		const r = isRolling("1d100+$dexterite;&+5", withStats(STATS), STATS_NAME);
		expect(r!.result.dice).toBe("1d100+40;&+5");
		expect(r!.statsPerSegment).toEqual(["Dextérité", ""]);
	});
});

describe("roll parsing — semi-direct roll (`text before [dice]`) with a custom formula", () => {
	it("rolls a bare bracket with no nested formula target as a plain die", () => {
		// "mon message [1d6]": the outer bracket only marks the semi-direct roll —
		// its content ("1d6") has no further "[...]" for the formula to target.
		const content = applySemiDirectCustomFormula("mon message [1d6]", "$>=85?85:$");
		const r = isRolling(content);
		expect(r!.detectRoll).toBe("1d6");
		expect(r!.result.total).toBeGreaterThanOrEqual(1);
		expect(r!.result.total).toBeLessThanOrEqual(6);
	});

	it("evaluates the false branch of a formula nested inside the semi-direct bracket", () => {
		// "mon message [1d100<=[75]]" → inner "[75]" is itself a formula target.
		const content = applySemiDirectCustomFormula(
			"mon message [1d100<=[75]]",
			"$>=85?85:$"
		);
		expect(content).toBe("mon message [1d100<={{(75)>=85?85:(75)}}]");
		const r = isRolling(content);
		expect(r!.detectRoll).toBe("1d100<=75");
		expect(r!.result.compare).toEqual({ sign: "<=", value: 75 });
	});

	it("evaluates the true branch of a formula nested inside the semi-direct bracket", () => {
		const content = applySemiDirectCustomFormula(
			"mon message [1d100<=[90]]",
			"$>=85?85:$"
		);
		expect(content).toBe("mon message [1d100<={{(90)>=85?85:(90)}}]");
		const r = isRolling(content);
		expect(r!.detectRoll).toBe("1d100<=85");
		expect(r!.result.compare).toEqual({ sign: "<=", value: 85 });
	});

	it("handles free text on both sides of the bracket", () => {
		const content = applySemiDirectCustomFormula("roule [1d100<=[40]] stp", "$*2");
		expect(content).toBe("roule [1d100<={{(40)*2}}] stp");
		const r = isRolling(content);
		expect(r!.result.compare).toEqual({ sign: "<=", value: 80 });
	});

	it("leaves a direct roll with no bracket unaffected by the formula", () => {
		const content = applySemiDirectCustomFormula("1d100<=75", "$>=85?85:$");
		expect(content).toBe("1d100<=75");
		const r = isRolling(content);
		expect(r!.result.compare).toEqual({ sign: "<=", value: 75 });
	});

	it("resolves a stat-backed formula bracket when the bracket comes first", () => {
		const content = applySemiDirectCustomFormula("[1d100<=[$dexterite]] stp", "$");
		const r = isRolling(content, withStats(STATS), STATS_NAME);
		expect(r!.result.compare).toEqual({ sign: "<=", value: 40 });
	});

	it("resolves a stat-backed formula bracket when free text precedes the bracket (regression)", () => {
		const content = applySemiDirectCustomFormula("roule [1d100<=[$dexterite]] stp", "$");
		const r = isRolling(content, withStats(STATS), STATS_NAME);
		expect(r!.result.compare).toEqual({ sign: "<=", value: 40 });
	});

	it("resolves a raw $stat inside a semi-direct bracket with no custom formula (regression)", () => {
		// Same DETECT_DICE_MESSAGE pitfall, without going through applySemiDirectCustomFormula
		// at all — a plain "$stat" typed directly inside a semi-direct bracket.
		const r = isRolling("roule [1d100<=$dexterite] stp", withStats(STATS), STATS_NAME);
		expect(r!.result.compare).toEqual({ sign: "<=", value: 40 });
	});

	it("resolves a multi-stat bracket that is only the comparator's value, not the whole roll (regression)", () => {
		const stats = { autre: 20, combat: 35, pugilat: 10, vita: 40 };
		const statsName = ["Vitalité", "Combat", "Pugilat", "Autre"];
		const r = isRolling(
			"1d100<=[$vita+$combat+$pugilat-$autre]",
			withStats(stats),
			statsName
		);
		expect(r!.result.dice).toContain("1d100");
		expect(r!.result.compare?.sign).toBe("<=");
		expect(r!.result.compare?.value).toBe(65);
	});

	it("keeps a dice-notation bracket wrapped in [...] even with a single stat inside it (regression)", () => {
		const r = isRolling("roule [1d100<=$dexterite] stp", withStats(STATS), STATS_NAME);
		expect(r!.detectRoll?.trim()).toBe("1d100<=40");
		expect(r!.result.compare).toEqual({ sign: "<=", value: 40 });
	});
});

describe("roll parsing — semi-direct roll wrapped in Discord markdown (regression)", () => {
	it.each([
		["*mon message [1d6]*", "italic (single *)"],
		["**mon message [1d6]**", "bold (double *)"],
		["_mon message [1d6]_", "italic (single _)"],
		["__mon message [1d6]__", "underline (double _)"],
		["~~mon message [1d6]~~", "strikethrough"],
		["||mon message [1d6]||", "spoiler"],
	])("passes the isNotADice gate and rolls: %s (%s)", (content) => {
		expect(isNotADice(content)).toBe(false);
		const r = isRolling(content);
		expect(r!.detectRoll).toBe("1d6");
		expect(r!.result.total).toBeGreaterThanOrEqual(1);
		expect(r!.result.total).toBeLessThanOrEqual(6);
	});
});
