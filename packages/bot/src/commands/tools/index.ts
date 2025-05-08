import { calc } from "./calc";
import { displayUser } from "./display";
import { editAvatar } from "./edit";
import { graph } from "./graph";

export const GIMMICK = [displayUser, graph, editAvatar, calc];
export * from "./calc";
export * from "./display";
export * from "./edit";
export * from "./graph";
export * from "./help";
export * from "./new_scene";
