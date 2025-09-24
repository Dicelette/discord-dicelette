import { calc } from "./calc";
import { displayUser } from "./display";
import { editAvatar } from "./edit";
import { graph } from "./graph";
import { math } from "./math";

export const GIMMICK = [displayUser, graph, editAvatar, calc, math];
export * from "./calc";
export * from "./display";
export * from "./edit";
export { default as getCount } from "./getCount";
export * from "./graph";
export * from "./help";
export * from "./math";
export * from "./new_scene";
