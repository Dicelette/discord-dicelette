import { merge } from "ts-deepmerge";
import type { SlashOverrides, SlashSpec } from "./types";

/**
 * Same layout as `custom_formula`: `<option> configure [value]` and `<option> display`.
 * The overrides are merged over the conventional keys; an overridden key without
 * translation (`exists`) falls back to the default one.
 */
export function resolveSlash(
	key: string,
	slash: true | SlashOverrides,
	exists: (key: string) => boolean = () => true
): SlashSpec {
	const base = "userSettings";
	const overrides = slash === true ? {} : slash;
	const valueKey = `${base}.${key}.value`;
	const defaults: SlashSpec = {
		description: `${base}.set.description`,
		display:
			slash === true || overrides.display
				? {
						description: `${base}.display.description`,
						empty: `${base}.display.empty`,
						reply: `${base}.display.reply`,
						subcommand: "display.title",
					}
				: undefined,
		group: `${base}.${key}.group`,
		groupDescription: `${base}.${key}.description`,
		messages: {
			invalid: `${base}.invalid`,
			reset: `${base}.reset`,
			saved: `${base}.saved`,
		},
		subcommand: `${base}.set.title`,
		valueDescription: exists(valueKey) ? valueKey : `${base}.set.description`,
		valueName: "common.value",
		valueParam: "value",
	};
	// A reviver returning `undefined` drops the key: untranslated overrides never reach the merge.
	const translated: SlashOverrides = JSON.parse(
		JSON.stringify(overrides),
		(name, value) =>
			typeof value === "string" && name !== "valueParam" && !exists(value)
				? undefined
				: value
	);
	return merge.withOptions(
		{ allowUndefinedOverrides: false },
		defaults,
		translated
	) as SlashSpec;
}
