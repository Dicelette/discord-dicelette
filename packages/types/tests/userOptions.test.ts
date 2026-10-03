import Enmap from "enmap";
import { describe, expect, it } from "vitest";
import {
	getUserOptionsBySection,
	parseUserOption,
	storeUserOption,
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
		expect(USER_OPTION_KEYS).toEqual([
			"customFormula",
			"prefixEditComment",
			"ignoreNotfound",
		]);
		expect(getUserOptionsBySection("general")).toEqual([
			"customFormula",
			"prefixEditComment",
		]);
	});
});

describe("storeUserOption", () => {
	const newStore = () =>
		new Enmap<Record<string, Record<string, unknown>>>({ inMemory: true });

	it("resets an option on a guild that has no user settings yet", () => {
		const store = newStore();
		expect(() =>
			storeUserOption(store, "guild", "user", "prefixEditComment", undefined)
		).not.toThrow();
	});

	it("sets then unsets an option", () => {
		const store = newStore();
		storeUserOption(store, "guild", "user", "prefixEditComment", "~");
		expect(store.get("guild", "user.prefixEditComment")).toBe("~");
		storeUserOption(store, "guild", "user", "prefixEditComment", undefined);
		expect(store.get("guild", "user.prefixEditComment")).toBeUndefined();
	});
});
