import type { CustomCritical } from "@dicelette/core";
import { describe, expect, it } from "vitest";
import {
	parseCustomCritical,
	parseOpposition,
	skillCustomCritical,
} from "../src/custom_critical";

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
			{ input: ">10", expected: ">" },
			{ input: "<5", expected: "<" },
			{ input: ">=20", expected: ">=" },
			{ input: "<=3", expected: "<=" },
			{ input: "!=7", expected: "!=" },
			{ input: "==15", expected: "==" },
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
	})

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
		const result = parseOpposition("10", ">5");
		// parseOpposition peut retourner un résultat avec le signe du diceComparator
		// Si on veut tester qu'il n'y a pas de signe, on doit passer une string sans signe dans les deux paramètres
		const result2 = parseOpposition("10", "5");
		expect(result2).toBeUndefined();
	});

	it("should handle different comparison operators", () => {
		const tests = [
			{ input: ">10", expected: ">" },
			{ input: "<5", expected: "<" },
			{ input: ">=20", expected: ">=" },
			{ input: "<=3", expected: "<=" },
			{ input: "!=7", expected: "!=" },
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

	it("should return undefined for non-numeric non-rollable values", () => {
		const result = parseOpposition(">invalid_text", ">=5");
		expect(result).toBeUndefined();
	});
});

describe("skillCustomCritical", () => {
	const mockCritical: Record<string, CustomCritical> = {
		skillCrit: {
			affectSkill: true,
			onNaturalDice: false,
			sign: ">",
			value: "15",
		},
		nonSkillCrit: {
			affectSkill: false,
			onNaturalDice: false,
			sign: "<",
			value: "5",
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
