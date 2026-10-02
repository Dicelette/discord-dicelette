import {
	resolveSlash,
	type SlashSpec,
	USER_OPTIONS,
	type UserOptionDef,
} from "@dicelette/types";
import type * as Djs from "discord.js";
import i18next from "i18next";

type Defs = Record<string, UserOptionDef>;

/** Groups whose builder is written by hand and extended with `addGeneratedSubcommands`. */
const HANDWRITTEN_GROUPS = new Set(["userSettings.attributes.title"]);

export function slashEntries(defs: Defs) {
	return Object.entries(defs)
		.filter(([, def]) => def.slash)
		.map(([key, def]) => ({ def, key, spec: resolveSlash(key, def.slash!) }));
}

export function slashI18nKeys(spec: SlashSpec) {
	const { display, messages } = spec;
	return [
		spec.group,
		spec.groupDescription,
		spec.subcommand,
		spec.description,
		spec.valueName,
		spec.valueDescription,
		...Object.values(messages),
		...(display ? Object.values(display) : []),
	].filter((key): key is string => !!key);
}

export function missingSlashKeys(spec: SlashSpec, languages: string[]) {
	return languages.flatMap((lng) =>
		slashI18nKeys(spec)
			.filter((key) => i18next.getResource(lng, "translation", key) === undefined)
			.map((key) => `${lng}: ${key}`)
	);
}

/** Fails at startup with the missing keys instead of an opaque Discord builder error. */
function checkedSlashEntries(defs: Defs) {
	const entries = slashEntries(defs);
	for (const { key, spec } of entries) {
		const missing = missingSlashKeys(spec, ["en"]);
		if (missing.length > 0)
			throw new Error(
				`Slash option "${key}" is missing translations:\n${missing.join("\n")}`
			);
	}
	return entries;
}

export function addGeneratedSubcommands(
	group: Djs.SlashCommandSubcommandGroupBuilder,
	groupKey: string,
	defs: Defs = USER_OPTIONS
) {
	const addValue = <
		T extends Djs.SlashCommandStringOption | Djs.SlashCommandBooleanOption,
	>(
		option: T,
		name: string,
		description: string
	): T => {
		option.setNames(name).setDescriptions(description).setRequired(false);
		return option;
	};

	for (const { def, spec } of checkedSlashEntries(defs).filter(
		(e) => e.spec.group === groupKey
	)) {
		group.addSubcommand((sub) => {
			sub.setNames(spec.subcommand).setDescriptions(spec.description);
			return def.kind === "boolean"
				? sub.addBooleanOption((o) => addValue(o, spec.valueName, spec.valueDescription))
				: sub.addStringOption((o) => addValue(o, spec.valueName, spec.valueDescription));
		});
		const display = spec.display;
		if (display)
			group.addSubcommand((sub) =>
				sub.setNames(display.subcommand).setDescriptions(display.description)
			);
	}
	return group;
}

/** Creates the groups that have no handwritten builder. */
export function addGeneratedGroups(
	data: Pick<Djs.SlashCommandBuilder, "addSubcommandGroup">,
	defs: Defs = USER_OPTIONS
) {
	const groups = new Map<string, string>();
	for (const { spec } of checkedSlashEntries(defs))
		if (!HANDWRITTEN_GROUPS.has(spec.group))
			groups.set(spec.group, spec.groupDescription);
	for (const [title, description] of groups)
		data.addSubcommandGroup((group) =>
			addGeneratedSubcommands(
				group.setNames(title).setDescriptions(description),
				title,
				defs
			)
		);
}
