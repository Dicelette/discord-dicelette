import { t } from "@dicelette/localization";
import { ADMIN } from "./admin";
import { deleteChar } from "./admin/delete_char";
import { PRIVATES_COMMANDS } from "./private";
import { GLOBAL_CMD, mjRoll, ROLL_AUTO, ROLL_CMDLIST } from "./roll";
import snippets from "./roll/snippets";
import { GIMMICK, getCount, help, math, newScene } from "./tools";
import { userSettings } from "./userSettings";

export const AUTOCOMPLETE_COMMANDS = [
	...ROLL_AUTO,
	...GIMMICK,
	deleteChar,
	help,
	snippets,
	userSettings,
	mjRoll,
];
export const COMMANDS_GLOBAL = [
	...ADMIN,
	...ROLL_CMDLIST,
	deleteChar,
	help,
	newScene,
	getCount,
	userSettings,
	...GLOBAL_CMD,
	mjRoll,
	math,
];

export const GUILD_ONLY_COMMANDS = [...ROLL_AUTO, ...GIMMICK];
export const COMMANDS = [...GUILD_ONLY_COMMANDS, ...COMMANDS_GLOBAL];
export const DATABASE_NAMES = [
	t("common.macro"),
	t("dbRoll.name"),
	t("calc.title"),
	t("display.title"),
	t("graph.name"),
	t("edit.title"),
];

export const ALL_COMMANDS = COMMANDS.concat(PRIVATES_COMMANDS);
export const ALL_COMMANDS_BY_NAME = new Map(
	ALL_COMMANDS.map((command) => [command.data.name, command])
);
export const AUTOCOMPLETE_COMMANDS_BY_NAME = new Map(
	AUTOCOMPLETE_COMMANDS.map((command) => [command.data.name, command])
);

export * from "./admin";
export { clearCacheKey, createCacheKey, triggerPity } from "./admin/configuration/pity";
export * from "./context_menus";
export * from "./private";
export * from "./roll";
export * from "./tools";
