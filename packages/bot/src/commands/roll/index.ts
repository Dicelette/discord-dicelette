import { choose, info } from "../tools";
import { diceRoll } from "./base_roll";
import { dbRoll } from "./dbroll";
import macro from "./macro";

export { mjRoll } from "./mj_roll";

import snippets from "./snippets";

export * from "./base_roll";
export const ROLL_AUTO = [dbRoll, macro];
export const ROLL_CMDLIST = [snippets];
export const GLOBAL_CMD = [diceRoll, choose, info];
