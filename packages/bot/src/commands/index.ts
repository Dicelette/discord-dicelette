import { t } from "@dicelette/localization";
import { ADMIN } from "./admin";
import { deleteChar } from "./admin/delete_char";
import { PRIVATES_COMMANDS } from "./private";
import { GLOBAL_CMD, ROLL_AUTO, ROLL_CMDLIST } from "./roll";
import snippets from "./roll/snippets";
import { GIMMICK, getCount, help } from "./tools";
import newScene from "./tools/new_scene";
import { userSettings } from "./userSettings";

export const AUTOCOMPLETE_COMMANDS = [
	...ROLL_AUTO,
	...GIMMICK,
	deleteChar,
	help,
	snippets,
	userSettings,
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

export const ALL_COMMANDS = COMMANDS.concat(PRIVATES_COMMANDS, GLOBAL_CMD);

export * from "./admin";
export { clearCacheKey, createCacheKey, triggerPity } from "./admin/configuration/pity";
export * from "./context_menus";
export * from "./private";
export * from "./roll";
export * from "./tools";
