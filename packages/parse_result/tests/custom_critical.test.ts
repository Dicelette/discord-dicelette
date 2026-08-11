import type { CustomCritical } from "@dicelette/core";
import { ln } from "@dicelette/localization";
import * as Djs from "discord.js";
import { describe, expect, it } from "vitest";
import {
	getCriticalFromDice,
	mergeCustomCriticals,
	parseCustomCritical,
	parseOpposition,
	rollCustomCriticalsFromDice,
	skillCustomCritical,
} from "../src/custom_critical";
import {
	applyCustomFormula,
	applySemiDirectCustomFormula,
	replaceStatsInDiceFormula,
} from "../src/dice_extractor";

describe("parseCustomCritical", () => {
	it("should parse basic critical condition", () => {
		const result = parseCustomCritical("damage", ">10");
		expect(result).toBeDefined();
		expect(result?.damage).toBeDefined();
		expect(result?.damage.sign).toBe(">");
		expect(result?.damage.value).toBe("10");
		expect(result?.damage.onNaturalDice).toBe(false);
		expect(result?.damage.affectSkill).toBe(false);
	});

	it("should handle natural dice marker (N)", () => {
		const result = parseCustomCritical("(N) critical", ">=20");
		expect(result).toBeDefined();
		expect(result?.critical.onNaturalDice).toBe(true);
		expect(result?.critical.sign).toBe(">=");
		expect(result?.critical.value).toBe("20");
	});

	it("should handle skill affect marker (S)", () => {
		const result = parseCustomCritical("(S) skill", "<=5");
		expect(result).toBeDefined();
		expect(result?.skill.affectSkill).toBe(true);
		expect(result?.skill.sign).toBe("<=");
	});

	it("should handle both (N) and (S) markers", () => {
		const result = parseCustomCritical("(N)(S) test", "!=15");
		expect(result).toBeDefined();
		expect(result?.test.onNaturalDice).toBe(true);
		expect(result?.test.affectSkill).toBe(true);
		expect(result?.test.sign).toBe("!=");
	});

	it("should convert = to ==", () => {
		const result = parseCustomCritical("exact", "=10");
		expect(result).toBeDefined();
		expect(result?.exact.sign).toBe("==");
	});

	it("should handle different comparison operators", () => {
		const tests = [
			{ expected: ">", input: ">10" },
			{ expected: "<", input: "<5" },
			{ expected: ">=", input: ">=20" },
			{ expected: "<=", input: "<=3" },
			{ expected: "!=", input: "!=7" },
			{ expected: "==", input: "==15" },
		];

		for (const { input, expected } of tests) {
			const result = parseCustomCritical("test", input);
			expect(result?.test.sign).toBe(expected);
		}
	});

	it("should return undefined if no sign found", () => {
		const result = parseCustomCritical("invalid", "10");
		expect(result).toBeUndefined();
	});

	it("should return undefined if no value found", () => {
		const result = parseCustomCritical("invalid", ">");
		expect(result).toBeUndefined();
	});

	it("should return undefined if name is empty", () => {
		const result = parseCustomCritical("", ">10");
		expect(result).toBeUndefined();
	});

	it("should trim and standardize the name", () => {
		const result = parseCustomCritical("  test name  ", ">10");
		expect(result).toBeDefined();
		// The name is trimmed, so the key should be "test name" not "  test name  "
		const keys = Object.keys(result || {});
		expect(keys.length).toBeGreaterThan(0);
		expect(keys[0].trim()).toBe("test name");
	});

	it("should standardize and trim the value", () => {
		const result = parseCustomCritical("test", ">  10  ");
		expect(result).toBeDefined();
		expect(result?.test.value).toBe("10");
	});

	it("should handle complex values with expressions", () => {
		const result = parseCustomCritical("complex", ">1d6+3");
		expect(result).toBeDefined();
		expect(result?.complex.value).toBe("1d6+3");
	});
});

describe("parseOpposition", () => {
	it("should parse simple opposition", () => {
		const result = parseOpposition(">10", ">=5");
		expect(result).toBeDefined();
		expect(result?.sign).toBe(">");
		expect(result?.value).toBe(10);
	});

	it("should handle numeric opposition values", () => {
		const result = parseOpposition("<15", ">5");
		expect(result).toBeDefined();
		expect(result?.sign).toBe("<");
		expect(result?.value).toBe(15);
	});

	it("should convert = to ==", () => {
		const result = parseOpposition("=10", ">5");
		expect(result).toBeDefined();
		expect(result?.sign).toBe("==");
	});

	it("should return undefined if no sign found", () => {
		const result2 = parseOpposition("10", "5");
		expect(result2).toBeUndefined();
	});

	it("should handle different comparison operators", () => {
		const tests = [
			{ expected: ">", input: ">10" },
			{ expected: "<", input: "<5" },
			{ expected: ">=", input: ">=20" },
			{ expected: "<=", input: "<=3" },
			{ expected: "!=", input: "!=7" },
		];

		for (const { input, expected } of tests) {
			const result = parseOpposition(input, ">0");
			expect(result?.sign).toBe(expected);
		}
	});

	it("should handle opposition with statistics", () => {
		const stats = { strength: 15 };
		const result = parseOpposition(">strength", ">=5", stats);
		expect(result).toBeDefined();
		// Should use the stat value
		expect(result?.value).toBeGreaterThan(0);
	});

	it("should handle opposition with dollar value", () => {
		const result = parseOpposition(">$", ">=5", undefined, "10");
		expect(result).toBeDefined();
	});

	it("should throw an error for non-numeric non-rollable values", async () => {
		expect(() => parseOpposition(">invalid", ">=5")).toThrow();
	});

	it("should accept a comparator that rolls a total of 0", () => {
		const result = parseOpposition(">1d1-1", ">=5");
		expect(result).toBeDefined();
		expect(result?.value).toBe(0);
		expect(result?.originalDice).toBe("1d1-1");
	});

	it("should accept a plain 0 comparator", () => {
		const result = parseOpposition(">=0", ">=5");
		expect(result).toEqual({ sign: ">=", value: 0 });
	});
});

describe("skillCustomCritical", () => {
	const mockCritical: Record<string, CustomCritical> = {
		nonSkillCrit: {
			affectSkill: false,
			onNaturalDice: false,
			sign: "<",
			value: "5",
		},
		skillCrit: {
			affectSkill: true,
			onNaturalDice: false,
			sign: ">",
			value: "15",
		},
	};

	it("should filter only criticals that affect skills", () => {
		const result = skillCustomCritical(mockCritical);
		expect(result).toBeDefined();
		expect(result?.skillCrit).toBeDefined();
		expect(result?.nonSkillCrit).toBeUndefined();
	});

	it("should return undefined when no criticals affect skills", () => {
		const noSkillCrit: Record<string, CustomCritical> = {
			test: {
				affectSkill: false,
				onNaturalDice: false,
				sign: ">",
				value: "10",
			},
		};
		const result = skillCustomCritical(noSkillCrit);
		expect(result).toBeUndefined();
	});

	it("should return undefined when customCritical is undefined", () => {
		const result = skillCustomCritical(undefined);
		expect(result).toBeUndefined();
	});

	it("should include criticals without dollar signs when no dollarsValue", () => {
		const result = skillCustomCritical(mockCritical);
		expect(result?.skillCrit).toBeDefined();
		expect(result?.skillCrit.value).toBe("15");
	});

	it("should skip criticals with dollar signs when no dollarsValue provided", () => {
		const dollarCrit: Record<string, CustomCritical> = {
			withDollar: {
				affectSkill: true,
				onNaturalDice: false,
				sign: ">",
				value: "$+5",
			},
		};
		const result = skillCustomCritical(dollarCrit);
		expect(result).toBeUndefined();
	});

	it("should process criticals with dollar signs when dollarsValue provided", () => {
		const dollarCrit: Record<string, CustomCritical> = {
			withDollar: {
				affectSkill: true,
				onNaturalDice: false,
				sign: ">",
				value: "$",
			},
		};
		const result = skillCustomCritical(dollarCrit, undefined, 10);
		expect(result).toBeDefined();
		expect(result?.withDollar).toBeDefined();
	});

	it("should handle multiple skill criticals", () => {
		const multipleCrit: Record<string, CustomCritical> = {
			first: {
				affectSkill: true,
				onNaturalDice: false,
				sign: ">",
				value: "10",
			},
			second: {
				affectSkill: true,
				onNaturalDice: false,
				sign: "<",
				value: "5",
			},
			third: {
				affectSkill: false,
				onNaturalDice: false,
				sign: ">=",
				value: "15",
			},
		};

		const result = skillCustomCritical(multipleCrit);
		expect(result).toBeDefined();
		expect(result?.first).toBeDefined();
		expect(result?.second).toBeDefined();
		expect(result?.third).toBeUndefined();
	});

	it("should handle criticals with statistics", () => {
		const statCrit: Record<string, CustomCritical> = {
			withStat: {
				affectSkill: true,
				onNaturalDice: false,
				sign: ">",
				value: "strength",
			},
		};

		const stats = { strength: 15 };
		const result = skillCustomCritical(statCrit, stats);
		expect(result).toBeDefined();
	});

	it("should return undefined when result is empty object", () => {
		const emptyCrit: Record<string, CustomCritical> = {};
		const result = skillCustomCritical(emptyCrit);
		expect(result).toBeUndefined();
	});
});

describe("integration tests", () => {
	it("should parse and filter skill criticals", () => {
		const parsed = parseCustomCritical("(S) test", ">10");
		expect(parsed).toBeDefined();

		if (parsed) {
			const filtered = skillCustomCritical(parsed);
			expect(filtered).toBeDefined();
			expect(filtered?.test).toBeDefined();
			expect(filtered?.test.affectSkill).toBe(true);
		}
	});

	it("should handle natural dice criticals", () => {
		const parsed = parseCustomCritical("(N) natural", ">=20");
		expect(parsed).toBeDefined();
		expect(parsed?.natural.onNaturalDice).toBe(true);
	});

	it("should handle complex critical conditions", () => {
		const parsed = parseCustomCritical("(N)(S) complex", "!=15");
		expect(parsed).toBeDefined();

		if (parsed) {
			expect(parsed.complex.onNaturalDice).toBe(true);
			expect(parsed.complex.affectSkill).toBe(true);
			expect(parsed.complex.sign).toBe("!=");
			expect(parsed.complex.value).toBe("15");

			const filtered = skillCustomCritical(parsed);
			expect(filtered).toBeDefined();
			expect(filtered?.complex).toBeDefined();
		}
	});
});

describe("mergeCustomCriticals", () => {
	const success = (value: string): CustomCritical => ({
		affectSkill: false,
		onNaturalDice: false,
		sign: "<=",
		value,
	});

	it("should return undefined when every layer is empty", () => {
		expect(mergeCustomCriticals(undefined, undefined)).toBeUndefined();
		expect(mergeCustomCriticals({}, undefined)).toBeUndefined();
	});

	it("should keep the last layer when the names collide", () => {
		const merged = mergeCustomCriticals(
			{ "Succès critique": success("1") },
			{ "Succès critique": success("2") },
			{ "Succès critique": success("3") }
		);
		expect(merged?.["Succès critique"].value).toBe("3");
	});

	it("should keep the entries that no other layer overrides", () => {
		const merged = mergeCustomCriticals({ "Échec critique": success("95") }, undefined, {
			"Succès critique": success("5"),
		});
		expect(Object.keys(merged ?? {})).toEqual(["Échec critique", "Succès critique"]);
	});

	it("should ignore the criticals of a branch the formula does not take", () => {
		const ul = ln(Djs.Locale.French);
		// `$>85?85{cs:<=5+($-85)}:$` only redefines the critical success above the 85 cap.
		// Below it, the template's own critical must survive untouched.
		const below = applyCustomFormula("1d100<=[50]", "$>85?85{cs:<=5+($-85)}:$");
		expect(rollCustomCriticalsFromDice(below, ul)).toBeUndefined();

		const template = { [ul("roll.critical.success")]: success("5") };
		expect(
			mergeCustomCriticals(template, rollCustomCriticalsFromDice(below, ul))
		).toEqual(template);

		// Above the cap the block applies: `<=5+(92-85)` → `<=12`.
		const above = applyCustomFormula("1d100<=[92]", "$>85?85{cs:<=5+($-85)}:$");
		expect(
			rollCustomCriticalsFromDice(above, ul)?.[ul("roll.critical.success")]?.value
		).toBe("12");
	});

	it("should let the command option win over the custom formula criticals", () => {
		const ul = ln(Djs.Locale.French);
		// `/snippets` rolling `1d100<=[92]` on a server whose custom formula caps the target
		// at 85 and moves the critical success accordingly — the branch is taken here.
		const dice = applyCustomFormula("1d100<=[92]", "$>=85?85{cs:>=5+($-85)}:$");
		const fromFormula = rollCustomCriticalsFromDice(dice, ul);
		expect(fromFormula?.[ul("roll.critical.success")]).toBeDefined();

		// …while the user asked for `succès_critique:<=5` on this roll only.
		const fromOption = { [ul("roll.critical.success")]: success("5") };
		const merged = mergeCustomCriticals(undefined, fromFormula, fromOption);
		expect(merged?.[ul("roll.critical.success")]).toEqual(success("5"));
	});

	it("should ignore a not-taken branch when the bracket only holds $stat tokens (free-text rolls)", () => {
		// Free-text rolls inject the custom formula before stats are resolved (unlike slash
		// commands, which resolve stats first), so applyCustomFormula can't yet tell whether
		// `$>90?...` is reachable and keeps the {cs:...} block unconditionally.
		const ul = ln(Djs.Locale.French);
		const formula = "$>90?90{cs:<=5+($-90)}:$";
		const dice = "1d100<=[$combat+$vita+$parade-15]";
		const injected = applyCustomFormula(dice, formula);
		expect(
			getCriticalFromDice(injected, ul)?.[ul("roll.critical.success")]
		).toBeDefined();

		// Redo it in the same order the slash commands use — resolve stats first, then apply
		// the formula — so reachability is decided on real numbers, same as applyCustomFormula
		// already does for a slash-command roll.
		// combat=40, vita=45, parade=10 → 80, which does not clear the 90 cap.
		const stats = { combat: 40, vita: 45, parade: 10 };
		const resolved = applySemiDirectCustomFormula(
			replaceStatsInDiceFormula(dice, stats).formula,
			formula
		);
		expect(rollCustomCriticalsFromDice(resolved, ul, undefined, stats)).toBeUndefined();

		const template = { [ul("roll.critical.success")]: success("5") };
		expect(
			mergeCustomCriticals(
				template,
				rollCustomCriticalsFromDice(resolved, ul, undefined, stats)
			)
		).toEqual(template);
	});
});
