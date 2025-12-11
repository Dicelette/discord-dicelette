// New class-based exports - use factory functions to create instances
export { AvatarFeature } from "./avatar";
export { MoveFeature } from "./move";
export { RenameFeature } from "./rename";
export { MacroFeature } from "./macro";
export { StatsFeature } from "./stats";
export { UserFeature } from "./user";

// Keep old module-based exports for compatibility during transition
export * as MacroModule from "./macro";
export * as StatsModule from "./stats";
export * as UserModule from "./user";
