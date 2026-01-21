// External
import { t } from "@dicelette/localization";
// Admin
import { ADMIN } from "./admin";
import { deleteChar } from "./admin/delete_char";
// Private commands
import { PRIVATES_COMMANDS } from "./private";
// Roll commands
import { GLOBAL_CMD, mjRoll, ROLL_AUTO, ROLL_CMDLIST } from "./roll";
// Tools & helpers
import { GIMMICK, getCount, help, math, newScene } from "./tools";
// Types & runtime guards
import type { Command, MarkedAutocomplete, MarkedDatabase } from "./types";
import { isMarkedAutocompleted, isMarkedDatabase } from "./types";
import { userSettings } from "./userSettings";

// Base groups kept for explicit ordering of commands
const BASE_GUILD = [...ROLL_AUTO, ...GIMMICK] as Command[];

// Grouped command buckets to make intent clearer
const ADMIN_COMMANDS = [...ADMIN, deleteChar] as Command[]; // admin-only utilities
const ROLL_COMMANDS = [...ROLL_CMDLIST, ...GLOBAL_CMD, mjRoll] as Command[]; // roll-related features
const TOOL_COMMANDS = [help, newScene, getCount, userSettings, math] as Command[]; // misc tools and helpers

// All global commands are composed from the named buckets above
export const COMMANDS_GLOBAL = [
	...ADMIN_COMMANDS,
	...ROLL_COMMANDS,
	...TOOL_COMMANDS,
] as Command[];

// All commands in desired registration order
export const COMMANDS = [...BASE_GUILD, ...COMMANDS_GLOBAL] as Command[];
export const ALL_COMMANDS = COMMANDS.concat(PRIVATES_COMMANDS as Command[]) as Command[];

// Derive special lists from builder flags added in `discord_ext` (typed via guards)
export const GUILD_ONLY_COMMANDS = COMMANDS.filter(isMarkedDatabase) as MarkedDatabase[];
export const AUTOCOMPLETE_COMMANDS = ALL_COMMANDS.filter(
	isMarkedAutocompleted
) as MarkedAutocomplete[];

export const DATABASE_NAMES = [
	t("common.macro"),
	t("dbRoll.name"),
	t("calc.title"),
	t("display.title"),
	t("graph.name"),
	t("edit.title"),
];

// Note: command lists are exported inline where they are declared (no duplicate exports)
// -----------------------------
// Module re-exports (direct + namespaced for discoverability)
// - Keep direct re-exports for backwards compatibility
// - Add namespaced exports to make it easier to find command groups
// -----------------------------
export * from "./admin";
export * as Admin from "./admin";
export { clearCacheKey, createCacheKey, triggerPity } from "./admin/configuration/pity";
export * from "./context_menus";
export * as ContextMenus from "./context_menus";
export * from "./private";
export * as PrivateCommands from "./private";
export * from "./roll";
export * as RollCommands from "./roll";
export * from "./tools";
export * as Tools from "./tools";
// -----------------------------
// Re-export types and runtime guards
// -----------------------------
export type { Command, MarkedAutocomplete, MarkedDatabase } from "./types";
export { isMarkedAutocompleted, isMarkedDatabase } from "./types";
