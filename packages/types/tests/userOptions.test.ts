import Enmap from "enmap";
import { describe, expect, it } from "vitest";
import {
	getUserOptionsBySection,
	parseUserOption,
	resolveSlash,
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

describe("resolveSlash", () => {
	const override = {
		description: "custom.description",
		messages: { notFound: "custom.notFound", saved: "custom.saved" },
		valueDescription: "custom.value",
	};

	it("keeps the override when its translation exists", () => {
		const spec = resolveSlash("opt", override, () => true);
		expect(spec.description).toBe("custom.description");
		expect(spec.messages.saved).toBe("custom.saved");
		expect(spec.messages.notFound).toBe("custom.notFound");
	});

	it("falls back to the default key when the override has no translation", () => {
		const exists = (key: string) => !key.startsWith("custom.");
		const spec = resolveSlash("opt", override, exists);
		expect(spec.description).toBe("userSettings.set.description");
		expect(spec.messages.saved).toBe("userSettings.saved");
		expect(spec.messages.notFound).toBeUndefined();
		expect(spec.valueDescription).toBe("userSettings.opt.value");
	});

	it("chains to the generic value description, then reports the first default", () => {
		const onlyGeneric = (key: string) => key === "userSettings.set.description";
		expect(resolveSlash("opt", true, onlyGeneric).valueDescription).toBe(
			"userSettings.set.description"
		);
		expect(resolveSlash("opt", true, () => false).groupDescription).toBe(
			"userSettings.opt.description"
		);
	});

	it("only adds a display subcommand for `true` or an explicit display override", () => {
		expect(resolveSlash("opt", true).display?.subcommand).toBe("display.title");
		expect(resolveSlash("opt", { description: "x" }).display).toBeUndefined();
	});
});
