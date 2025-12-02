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
		const text = res.defaultMessage();
		expect(text).toContain("test");
	});
	it("should display dynamic dice notation with parentheses", () => {
		const result: Resultat = {
			dice: "1d(8+5)",
			result: "1d13: [7] = 7",
			total: 7,
		};
		const res = new ResultAsText(result, DATA);
		const text = res.defaultMessage();
		expect(text).toContain("1d(8+5)");
		expect(text).toContain("1d13");
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
