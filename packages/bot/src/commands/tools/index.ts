import { calc } from "./calc";
import { displayUser } from "./display";
import { editAvatar } from "./edit";
import { graph } from "./graph";
import { math } from "./math";

export const GIMMICK = [displayUser, graph, editAvatar, calc, math];
export * from "./calc";
export * from "./choose";
export * from "./display";
export * from "./edit";
export * from "./graph";
export * from "./help";

export { createHelpMessageDB, helpAtInvit } from "./help/createHelpMessage";
export { default as getCount } from "./karma";
export * from "./math";
export * from "./new_scene";
