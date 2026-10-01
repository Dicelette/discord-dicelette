import {
	DEFAULT_SLASH_GROUP,
	resolveSlash,
	USER_OPTIONS,
	type UserOptionDef,
} from "@dicelette/types";
import type * as Djs from "discord.js";

type Defs = Record<string, UserOptionDef>;

export const LIST_TITLE = "userSettings.options.list.title";

/** Groups whose builder is written by hand and extended with `addGeneratedSubcommands`. */
const HANDWRITTEN_GROUPS = new Set(["userSettings.attributes.title"]);

export function slashEntries(defs: Defs) {
	return Object.entries(defs)
		.filter(([, def]) => def.slash)
		.map(([key, def]) => ({ def, key, spec: resolveSlash(key, def.slash!) }));
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

	for (const { def, spec } of slashEntries(defs).filter(
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
	if (groupKey === DEFAULT_SLASH_GROUP)
		group.addSubcommand((sub) =>
			sub.setNames(LIST_TITLE).setDescriptions("userSettings.options.list.description")
		);
	return group;
}

/** Creates the groups that have no handwritten builder. */
export function addGeneratedGroups(
	data: Pick<Djs.SlashCommandBuilder, "addSubcommandGroup">,
	defs: Defs = USER_OPTIONS
) {
	const groups = new Map<string, string>();
	for (const { spec } of slashEntries(defs))
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
