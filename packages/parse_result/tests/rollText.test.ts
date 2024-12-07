import type { CustomCritical, Resultat } from "@dicelette/core";
import { ln } from "@dicelette/localization";
import * as Djs from "discord.js";
import { describe, expect, it } from "vitest";
import type { Server } from "../src/interfaces";
import { ResultAsText, convertCustomCriticalValue, getRoll } from "../src/result_as_text";
const data: Server = {
	lang: Djs.Locale.EnglishUS,
	userId: "mara__li",
};

describe("roll", () => {
	it("simple roll with 1d20", () => {
		const rollIng = getRoll("1d20");
		expect(rollIng?.total).toBeLessThanOrEqual(20);
	});
});

describe("custom critical roll", () => {
	const customCritical: CustomCritical = {
		onNaturalDice: false,
		value: "round($/2)",
		sign: ">",
	};
	it("replace the value with the stats", () => {
		const result = convertCustomCriticalValue({ test: customCritical }, 6);
		expect(result.test.value).toBe("3");
	});
	it("should display the name of critical roll", () => {
		const result: Resultat = {
			dice: "1d20",
			compare: {
				sign: ">",
				value: 3,
			},
			result: "1d20: [4] = 4",
			total: 4,
		};
		const critical = convertCustomCriticalValue({ test: customCritical }, 6);
		const ul = ln(data.lang);
		const res = new ResultAsText(
			result,
			data,
			{ success: 20, failure: 1 },
			undefined,
			undefined,
			critical
		);
		const text = res.defaultMessage();
		expect(text).toContain("test");
	});
});
