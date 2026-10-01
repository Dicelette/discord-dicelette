import { describe, expect, it } from "vitest";
import {
	getUserOptionsBySection,
	parseUserOption,
	USER_OPTION_KEYS,
} from "../src/userOptions";

describe("parseUserOption", () => {
	it("trims strings and unsets empty ones", () => {
		expect(parseUserOption("ignoreNotfound", "  0  ")).toEqual({ ok: true, value: "0" });
		expect(parseUserOption("ignoreNotfound", "   ")).toEqual({
			ok: true,
			value: undefined,
		});
	});

	it("rejects values of the wrong type", () => {
		expect(parseUserOption("ignoreNotfound", 1).ok).toBe(false);
	});

	it("runs the option validator", () => {
		expect(parseUserOption("customFormula", "$ + 1")).toEqual({
			ok: true,
			value: "$ + 1",
		});
		expect(parseUserOption("customFormula", "((").ok).toBe(false);
	});
});

describe("USER_OPTIONS", () => {
	it("lists every key and filters by section", () => {
		expect(USER_OPTION_KEYS).toEqual(["customFormula", "ignoreNotfound"]);
		expect(getUserOptionsBySection("general")).toEqual(["customFormula"]);
	});
});
