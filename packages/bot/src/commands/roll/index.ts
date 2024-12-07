import { diceRoll } from "./base_roll";
import dbd from "./dbd";
import { dbRoll } from "./dbroll";
import { mjRoll } from "./mj_roll";

export const ROLL_AUTO = [dbRoll, dbd, mjRoll];
export const ROLL_CMDLIST = [diceRoll];
