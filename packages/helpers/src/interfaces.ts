import type { CustomCritical } from "@dicelette/core";
import type { GuildData, Translation } from "@dicelette/types";
import type * as Djs from "discord.js";
/** Common interaction options, extracted once to avoid repetitive `options.getString(t(...))` calls. */
export interface CommonOptions {
	character?: string;
	statistic?: string;
	name?: string;
	dice?: string;
	expression?: string;
	comments?: string;
	user?: Djs.User;
}

/** Options extracted from a Discord command interaction for dice rolling. */
export interface RollInteractionOptions {
	/** Default: "0" */
	expression: string;
	threshold?: string;
	/** Opposition value for contested rolls */
	oppositionVal?: string;
	customCritical?: Record<string, CustomCritical>;
	userComments?: string;
	/** Formatted with a `#` prefix if present */
	comments: string;
}

/** CSV row type for import/export. */
export type CSVRow = {
	user: string;
	charName: string | undefined | null;
	avatar: string | undefined | null;
	isPrivate: boolean | undefined;
	channel: string | undefined;
	dice: string | undefined;
	[key: string]: string | number | undefined | boolean | null;
};

/** Interaction context: translation function, locale, and guild config. */
export interface InteractionContext {
	/** Translation function for the interaction's locale */
	ul: Translation;
	/** Locale to use for this interaction */
	langToUse: Djs.Locale;
	/** Guild configuration if interaction is in a guild */
	config?: GuildData;
}
