export * from "./src/extract_options";
export * from "./src/fetch";
export * from "./src/guild_context";
export * from "./src/interaction_context";
export * from "./src/moderation_cache";
// Alias for backward compatibility
export { buildModerationButtons as makeValidationRow } from "./src/moderation_cache";
export * from "./src/options";

/**
 * CSV Row type for import/export functionality.
 * Used when parsing CSV data containing user statistics and character information.
 */
export type CSVRow = {
	user: string;
	charName: string | undefined | null;
	avatar: string | undefined | null;
	isPrivate: boolean | undefined;
	channel: string | undefined;
	dice: string | undefined;
	[key: string]: string | number | undefined | boolean | null;
};
