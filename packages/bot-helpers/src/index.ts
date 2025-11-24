export * from "./guild_context";
export * from "./options";

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
