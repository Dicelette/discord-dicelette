import { describe, expect, it } from "vitest";
import { replaceStatsInDiceFormula } from "../src/dice_extractor";

describe("replaceStatsInDiceFormula - parentheses around $stat", () => {
	it("replaces ($puissance) by 40 without keeping parentheses", () => {
		const content = "1d100+($puissance)";
		const stats = { puissance: 40 } as Record<string, number>;

		const result = replaceStatsInDiceFormula(content, stats);

		expect(result.formula).toContain("1d100+40");
		expect(result.infoRoll).toBe("Puissance");
	});

	it("replaces in bracketed formula and preserves comments", () => {
		const content = "{14d10>($puissance)f=1} # coucou";
		const stats = { puissance: 40 } as Record<string, number>;

		const result = replaceStatsInDiceFormula(content, stats);

		expect(result.formula).toContain("{14d10>40f=1}");
		expect(result.formula).toContain("coucou");
		expect(result.infoRoll).toBe("Puissance");
	});
});
