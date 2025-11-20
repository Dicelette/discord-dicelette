import { t } from "@dicelette/localization";
import { ADMIN } from "./admin";
import { deleteChar } from "./admin/delete_char";
import { PRIVATES_COMMANDS } from "./private";
import { GLOBAL_CMD, ROLL_AUTO, ROLL_CMDLIST, ROLL_DB } from "./roll";
import { choose, GIMMICK, getCount, help } from "./tools";
import newScene from "./tools/new_scene";
import { userSettings } from "./userSettings";

export const AUTOCOMPLETE_COMMANDS = [...ROLL_AUTO, ...GIMMICK, deleteChar, help];
export const COMMANDS = [
	...ROLL_AUTO,
	...ROLL_CMDLIST,
	...GIMMICK,
	...ADMIN,
	deleteChar,
	help,
	newScene,
	getCount,
	...GLOBAL_CMD,
	choose,
	userSettings,
];

export const DATABASE_COMMANDS = [...GIMMICK, ...ROLL_DB];
export const DATABASE_NAMES = [
	t("common.macro"),
	t("dbRoll.name"),
	t("calc.title"),
	t("display.title"),
	t("graph.name"),
	t("edit.title"),
];

export const ALL_COMMANDS = COMMANDS.concat(PRIVATES_COMMANDS);

export * from "./admin";
export * from "./context_menus";
export * from "./private";
export * from "./roll";
export * from "./tools";
