import {
	resolveSlash,
	type SlashSpec,
	type Translation,
	USER_OPTIONS,
	type UserOptionDef,
} from "@dicelette/types";
import type * as Djs from "discord.js";
import i18next from "i18next";

type Defs = Record<string, UserOptionDef>;

/** Groups whose builder is written by hand and extended with `addGeneratedSubcommands`. */
const HANDWRITTEN_GROUPS = new Set(["userSettings.attributes.title"]);

export function snakeCase(str: string) {
	return str
		.replace(/\W+/g, " ")
		.split(/ |\B(?=[A-Z])/)
		.map((word) => word.toLowerCase())
		.join("_");
}

/** Resolves i18next contexts too: with `male`, `reply` is found through `reply_male` or `reply`. */
export const hasKey = (key: string, lng = "en", context?: string) =>
	i18next.exists(key, { context, fallbackLng: false, lng });

/** Translated group name, or the option key in snake_case when no translation exists. */
export function groupName(key: string, spec: SlashSpec, t: Translation) {
	return hasKey(spec.group) ? t(spec.group) : snakeCase(key);
}

export function displayedCommandName(key: string, spec: SlashSpec, t: Translation) {
	const defaultName = `userSettings.${key}.title`;
	if (hasKey(spec.group)) return t(spec.group);
	if (hasKey(defaultName)) return t(defaultName);
	return snakeCase(key);
}

export function slashEntries(defs: Defs) {
	return Object.entries(defs)
		.filter(([, def]) => def.slash)
		.map(([key, def]) => ({
			def,
			key,
			spec: resolveSlash(key, def.slash!, (k) => hasKey(k, "en", def.context)),
		}));
}

type SlashEntry = { def: UserOptionDef; spec: SlashSpec };

/** `invalid` can only be shown by options that validate their value. */
export function slashI18nKeys({ def, spec }: SlashEntry) {
	const { invalid, ...messages } = spec.messages;
	const validates = def.kind === "string" && !!def.validate;
	return [
		spec.groupDescription,
		spec.subcommand,
		spec.description,
		spec.valueName,
		...Object.values(messages),
		...(validates ? [invalid] : []),
		...(spec.display ? Object.values(spec.display) : []),
	].filter((key): key is string => !!key);
}

export function missingSlashKeys(entry: SlashEntry, languages: string[]) {
	return languages.flatMap((lng) =>
		slashI18nKeys(entry)
			.filter((key) => !hasKey(key, lng, entry.def.context))
			.map((key) => `${lng}: ${key}`)
	);
}

/** Fails at startup with the missing keys instead of an opaque Discord builder error. */
function checkedSlashEntries(defs: Defs) {
	const entries = slashEntries(defs);
	for (const { def, key, spec } of entries) {
		const missing = missingSlashKeys({ def, spec }, ["en"]);
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
	const groups = new Map<string, { key: string; spec: SlashSpec }>();
	for (const { key, spec } of checkedSlashEntries(defs))
		if (!HANDWRITTEN_GROUPS.has(spec.group)) groups.set(spec.group, { key, spec });
	for (const [groupKey, { key, spec }] of groups)
		data.addSubcommandGroup((group) => {
			if (hasKey(groupKey)) group.setNames(groupKey);
			else group.setName(snakeCase(key));
			return addGeneratedSubcommands(
				group.setDescriptions(spec.groupDescription),
				groupKey,
				defs
			);
		});
}
