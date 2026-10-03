import type { SlashOverrides, SlashSpec } from "./types";

type Exists = (key: string) => boolean;

/**
 * Merges an option's overrides with the conventional keys: the first candidate whose
 * translation exists wins (override first, then the defaults). When none exists, the
 * first default is returned so the missing key can be reported.
 */
function pick(exists: Exists, override: string | undefined, ...defaults: string[]) {
	const candidates = override ? [override, ...defaults] : defaults;
	return candidates.find(exists) ?? defaults[0];
}

/**
 * Same layout as `custom_formula`: `<option> configure [value]` and `<option> display`.
 * `exists` tells whether a translation key is defined, so an overridden key that has no
 * translation falls back to the default one.
 */
export function resolveSlash(
	key: string,
	slash: true | SlashOverrides,
	exists: Exists = () => true
): SlashSpec {
	const base = "userSettings";
	const o = slash === true ? {} : slash;
	const defaultDisplay = {
		description: `${base}.display.description`,
		empty: `${base}.display.empty`,
		reply: `${base}.display.reply`,
		subcommand: "display.title",
	};
	const overrideDisplay = slash === true ? defaultDisplay : o.display;

	return {
		description: pick(exists, o.description, `${base}.set.description`),
		display: overrideDisplay && {
			description: pick(exists, overrideDisplay.description, defaultDisplay.description),
			empty: pick(exists, overrideDisplay.empty, defaultDisplay.empty),
			reply: pick(exists, overrideDisplay.reply, defaultDisplay.reply),
			subcommand: pick(exists, overrideDisplay.subcommand, defaultDisplay.subcommand),
		},
		group: pick(exists, o.group, `${base}.${key}.group`),
		groupDescription: pick(exists, o.groupDescription, `${base}.${key}.description`),
		messages: {
			invalid: pick(exists, o.messages?.invalid, `${base}.invalid`),
			notFound:
				o.messages?.notFound && exists(o.messages.notFound)
					? o.messages.notFound
					: undefined,
			reset: pick(exists, o.messages?.reset, `${base}.reset`),
			saved: pick(exists, o.messages?.saved, `${base}.saved`),
		},
		subcommand: pick(exists, o.subcommand, `${base}.set.title`),
		valueDescription: pick(
			exists,
			o.valueDescription,
			`${base}.${key}.value`,
			`${base}.set.description`
		),
		valueName: pick(exists, o.valueName, "common.value"),
		valueParam: o.valueParam ?? "value",
	};
}
