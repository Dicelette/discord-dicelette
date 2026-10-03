import { merge } from "ts-deepmerge";
import type { SlashOverrides, SlashSpec } from "./types";

/**
 * Same layout as `custom_formula`: `<option> configure [value]` and `<option> display`.
 * The overrides are merged over the conventional keys and always win, translated or not.
 * `exists` only picks the default value description (`<key>.value`, else the generic one).
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
	return merge(defaults, overrides) as SlashSpec;
}
