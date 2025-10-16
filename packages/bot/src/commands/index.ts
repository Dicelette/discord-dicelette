import { t } from "@dicelette/localization";
import { ADMIN } from "./admin";
import { deleteChar } from "./admin/delete_char";
import { ROLL_AUTO, ROLL_CMDLIST, ROLL_DB } from "./roll";
import { mpDiceRoll } from "./roll/mp_roll";
import { GIMMICK, getCount, help } from "./tools";
import newScene from "./tools/new_scene";

export const autCompleteCmd = [...ROLL_AUTO, ...GIMMICK, deleteChar, help];
export const commandsList = [
	...ROLL_AUTO,
	...ROLL_CMDLIST,
	...GIMMICK,
	...ADMIN,
	deleteChar,
	help,
	newScene,
	getCount,
	mpDiceRoll,
];
export const dbCmd = [...GIMMICK, ...ROLL_DB];
export const DB_CMD_NAME = [
	t("common.macro"),
	t("dbRoll.name"),
	t("calc.title"),
	t("display.title"),
	t("graph.name"),
	t("edit.title"),
];
export * from "./admin";
export * from "./context_menus";
export * from "./roll";
export * from "./tools";
