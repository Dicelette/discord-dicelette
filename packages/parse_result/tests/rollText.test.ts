import type { CustomCritical, Resultat } from "@dicelette/core";
import * as Djs from "discord.js";
import { describe, expect, it } from "vitest";
import { rollCustomCritical } from "../src/custom_critical";
import type { Server } from "../src/interfaces";
import { ResultAsText } from "../src/result_as_text";
import { getRoll } from "../src/utils";
const data: Server = {
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
		const res = new ResultAsText(dice, data).parser;
		expect(res).toContain("d20");
	});
	it("A result with a roll + custom success", () => {
		const customCritical: CustomCritical = {
			onNaturalDice: false,
			value: "1d8+{{round($/2)}}+force",
			sign: ">",
		};
		const dice = getRoll("1d20+6d2");
		const res = new ResultAsText(
			dice,
			data,
			{ success: 20, failure: 1 },
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
		value: "round($/2)+1d8",
		sign: "<=",
	};
	it("replace the value with the stats", () => {
		const result = rollCustomCritical({ test: customCritical }, 6);
		expect(result.test.dice?.originalDice).toBe("round(6/2)+1d8");
	});
	it("replace the value with the stats with name");
	{
		const userStats = { test: 6 };
		const statValue = 5;
		const customCritical: CustomCritical = {
			onNaturalDice: false,
			value: "round($/2)+test",
			sign: "<",
		};
		const result = rollCustomCritical({ test: customCritical }, statValue, userStats);
		expect(result.test.dice?.originalDice).toBe("round(5/2)+6");
	}
	it("should display the name of critical roll", () => {
		const result: Resultat = {
			dice: "1d20>25",
			compare: {
				sign: ">",
				value: 3,
			},
			result: "1d20: [1] = 1",
			total: 1,
		};
		const critical = rollCustomCritical({ test: customCritical }, 6);
		const res = new ResultAsText(
			result,
			data,
			{ success: 20, failure: 1 },
			undefined,
			undefined,
			critical
		);
		const text = res.defaultMessage();
		console.log(text);
		expect(text).toContain("test");
	});
});
