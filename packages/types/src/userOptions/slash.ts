import type { SlashOverrides, SlashSpec } from "./types";

/** Same layout as `custom_formula`: `<option> configure [value]` and `<option> display`. */
export function resolveSlash(key: string, slash: true | SlashOverrides): SlashSpec {
	const base = "userSettings.options";
	const spec = slash === true ? {} : slash;
	return {
		description: `${base}.set.description`,
		display:
			slash === true
				? {
						description: `${base}.display.description`,
						empty: `${base}.display.empty`,
						reply: `${base}.display.reply`,
						subcommand: "display.title",
					}
				: undefined,
		group: `${base}.${key}.group`,
		groupDescription: `${base}.${key}.description`,
		subcommand: `${base}.set.title`,
		valueDescription: `${base}.${key}.value`,
		valueName: "common.value",
		valueParam: "value",
		...spec,
		messages: {
			invalid: `${base}.invalid`,
			reset: `${base}.reset`,
			saved: `${base}.saved`,
			...spec.messages,
		},
	};
}
