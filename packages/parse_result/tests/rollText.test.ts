import type { CustomCritical, Resultat } from "@dicelette/core";
import * as Djs from "discord.js";
import { describe, expect, it } from "vitest";
import { rollCustomCritical } from "../src/custom_critical";
import { getRoll } from "../src/dice_extractor";
import type { Server } from "../src/interfaces";
import { ResultAsText } from "../src/result_as_text";

const DATA: Server = {
	lang: Djs.Locale.EnglishUS,
	userId: "mara__li",
};

describe("roll", () => {
	it("simple roll with 1d20", () => {
		const rollIng = getRoll("1d20");
		expect(rollIng?.total).toBeLessThanOrEqual(20);
	});
	it("A result within a simple roll", () => {
		const dice = getRoll("1d20+6d2");
		const res = new ResultAsText(dice, DATA).parser;
		expect(res).toContain("d20");
	});
	it("A result with a roll + custom success", () => {
		const customCritical: CustomCritical = {
			onNaturalDice: false,
			sign: ">",
			value: "1d8+{{round($/2)}}+force",
		};
		const dice = getRoll("1d20+6d2");
		const res = new ResultAsText(
			dice,
			DATA,
			{ failure: 1, success: 20 },
			"test",
			undefined,
			{ t: customCritical }
		).parser;
		expect(res).toContain("d20");
	});
});

describe("custom critical roll", () => {
	const customCritical: CustomCritical = {
		onNaturalDice: false,
		sign: "<=",
		value: "round($/2)+1d8",
	};
	it("replace the value with the stats", () => {
		const result = rollCustomCritical({ test: customCritical }, 6);
		expect(result?.test.dice?.originalDice).toBe("round(6/2)+1d8");
	});
	it("replace the value with the stats with name");
	{
		const userStats = { test: 6 };
		const statValue = 5;
		const customCritical: CustomCritical = {
			onNaturalDice: false,
			sign: "<",
			value: "round($/2)+test",
		};
		const result = rollCustomCritical({ test: customCritical }, statValue, userStats);
		expect(result?.test.dice?.originalDice).toBe("round(5/2)+6");
	}
	it("should display the name of critical roll", () => {
		const result: Resultat = {
			compare: {
				sign: ">",
				value: 3,
			},
			dice: "1d20>25",
			result: "1d20: [2] = 2",
			total: 2,
		};
		const critical = rollCustomCritical({ test: customCritical }, 6);
		const res = new ResultAsText(
			result,
			DATA,
			{ failure: 1, success: 20 },
			undefined,
			undefined,
			critical
		);
		const text = res.onMessageSend(undefined, "0189390243676422144");
		expect(text).toContain("test");
	});
	it("should display dynamic dice notation with parentheses", () => {
		const result: Resultat = {
			dice: "1d(8+5)",
			result: "1d13: [7] = 7",
			total: 7,
		};
		const res = new ResultAsText(result, DATA);
		const text = res.onMessageSend(undefined, "0189390243676422144");
		expect(text).toMatch(/`?1d\(8\+5\)`?\s*\|\s*`?1d13`?/);
		expect(text).toContain("[7]");
	});
});

describe("shared roll with statsPerSegment", () => {
	it("should display stat names next to symbols for shared rolls", () => {
		// Simulating the result of a shared roll: 1d100+$dext;&+$force
		// Where dext=40 and force=5
		const result: Resultat = {
			dice: "1d100+40;&+5",
			result: "※ 1d100+40: [13]+40 = 53;◈ [1d100+40]+5: [53]+5 = 58",
			total: 111,
		};

		const statsPerSegment = ["Dext", "Force"];
		const res = new ResultAsText(
			result,
			DATA,
			undefined,
			undefined,
			{ name: "Dext", standardized: "dext" },
			undefined,
			undefined,
			statsPerSegment
		);
		const text = res.defaultMessage();
		// Should contain stat names next to symbols
		expect(text).toContain("__Dext__");
		expect(text).toContain("__Force__");
		// Should not display global infoRoll at the top
		expect(text).not.toContain("[__Dext__]");
	});

	it("should handle dynamic dice in shared rolls with comparison", () => {
		// Simulating the result of: 1d(55+5);&+2>5
		// This should show:
		// - First segment: `1d(55+5)`: 1d60 ⟶ [28] = [28]
		// - Second segment: **Succès** — 1d60+2 ⟶ [28]+2 = [30] ⩾ 5
		const result: Resultat = {
			comment: undefined,
			compare: undefined,
			dice: "1d(55+5);&+2>5",
			modifier: { sign: "+", value: 5 },
			result: "※ 1d(55+5): [11] = 11;✓ [1d(55+5)]+2>5: [11]+2>5 = 13>5",
			total: 11,
		};

		const res = new ResultAsText(result, DATA);
		const text = res.onMessageSend();

		// Should contain dynamic dice notation in first segment
		expect(text).toContain("1d(55+5)");
		expect(text).toContain("1d60");

		// Should contain success/failure symbols
		expect(text).toMatch(/[※◈]/);
		expect(text).toContain("**");

		// Should NOT repeat the dynamic dice notation in the second segment
		const dynamicDiceCount = text.match(/1d\(55\+5\)/g)?.length || 0;
		expect(dynamicDiceCount).toBe(1); // Should appear only once
	});

	it("should not display stat names for non-shared rolls", () => {
		const result: Resultat = {
			dice: "1d100+40",
			result: "1d100+40: [13]+40 = 53",
			total: 53,
		};

		const res = new ResultAsText(result, DATA, undefined, undefined, {
			name: "Dext",
			standardized: "dext",
		});
		const text = res.defaultMessage();
		// Should display global infoRoll at the top
		expect(text).toContain("[__Dext__]");
	});
});

describe("interaction formatting with infoRoll", () => {
	it("should have newline after infoRoll when used as interaction without comment", () => {
		const result: Resultat = {
			dice: "1d45",
			result: "1d45: [33] = 33",
			total: 33,
		};

		// Simulate interaction by passing true to parse (via constructor)
		const res = new ResultAsText(result, DATA, undefined, undefined, {
			name: "Dextérité",
			standardized: "dexterite",
		});
		const text = res.defaultMessage();

		// Should have the infoRoll
		expect(text).toContain("[__Dextérité__]");
		// Should have a newline after infoRoll before dice (with possible blank line)
		expect(text).toMatch(/\[__Dextérité__\]\s*\n\s*`1d45`/);
	});

	it("should have newline after infoRoll when used as interaction with comment", () => {
		const result: Resultat = {
			comment: "cc",
			dice: "1d45 /* cc */",
			result: "1d45: [12] = 12",
			total: 12,
		};

		const res = new ResultAsText(result, DATA, undefined, undefined, {
			name: "Dextérité",
			standardized: "dexterite",
		});
		const text = res.defaultMessage();

		// Should have the infoRoll
		expect(text).toContain("[__Dextérité__]");
		// Should have the comment
		expect(text).toContain("*cc*");
		// infoRoll and comment should be on same line, then newline before dice
		expect(text).toMatch(/\[__Dextérité__\]\s+\*cc\*\n/);
	});

	it("should format correctly when used via onMessageSend", () => {
		const result: Resultat = {
			dice: "1d45",
			result: "1d45: [45] = 45",
			total: 45,
		};

		const res = new ResultAsText(result, DATA, undefined, "Laureen", {
			name: "Dextérité",
			standardized: "dexterite",
		});
		const messageText = res.onMessageSend(undefined, "189390243676422144");

		// Should have the infoRoll with newline after it
		expect(messageText).toMatch(/\[__Dextérité__\]\s*\n\s*`1d45`/);
	});
});
