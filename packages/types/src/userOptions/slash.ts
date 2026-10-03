import { merge } from "ts-deepmerge";
import type { SlashOverrides, SlashSpec } from "./types";

type Exists = (key: string) => boolean;
type Tree = { [key: string]: string | Tree | undefined };

/** Drops the overridden keys that have no translation, so the defaults take over. */
function translated({ valueParam, ...keys }: SlashOverrides, exists: Exists) {
	const prune = (node: Tree): Tree =>
		Object.fromEntries(
			Object.entries(node).flatMap<[string, string | Tree]>(([name, value]) => {
				if (typeof value === "string") return exists(value) ? [[name, value]] : [];
				return value ? [[name, prune(value)]] : [];
			})
		);
	return { ...prune(keys as Tree), valueParam };
}

/**
 * Same layout as `custom_formula`: `<option> configure [value]` and `<option> display`.
 * The overrides are merged over the conventional keys; an overridden key without
 * translation (`exists`) falls back to the default one.
 */
export function resolveSlash(
	key: string,
	slash: true | SlashOverrides,
	exists: Exists = () => true
): SlashSpec {
	const base = "userSettings";
	const overrides = slash === true ? {} : slash;
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
		valueDescription: `${base}.${key}.value`,
		valueName: "common.value",
		valueParam: "value",
	};
	const spec = merge.withOptions(
		{ allowUndefinedOverrides: false },
		defaults,
		translated(overrides, exists)
	) as SlashSpec;
	return exists(spec.valueDescription)
		? spec
		: { ...spec, valueDescription: `${base}.set.description` };
}
