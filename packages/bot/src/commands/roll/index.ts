import { select } from "../tools";
import { diceRoll } from "./base_roll";
import { dbRoll } from "./dbroll";
import macro from "./macro";
import { mjRoll } from "./mj_roll";
import { mpDiceRoll } from "./mp_roll";
import snippets from "./snippets";

export const ROLL_AUTO = [dbRoll, macro, mjRoll];
export const ROLL_CMDLIST = [diceRoll, snippets];
export const ROLL_DB = [macro, dbRoll];
export const GLOBAL_CMD = [mpDiceRoll, select];
