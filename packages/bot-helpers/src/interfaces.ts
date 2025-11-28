import type { GuildData, Translation } from "@dicelette/types";
import type * as Djs from "discord.js";
/**
 * Common interaction options extracted for convenience.
 * Reduces repetitive options.getString(t(...)) calls throughout the codebase.
 */
export interface CommonOptions {
	/** Character name from t("common.character") */
	character?: string;
	/** Statistic name from t("common.statistic") */
	statistic?: string;
	/** Skill/damage name from t("common.name") */
	name?: string;
	/** Dice value from t("common.dice") */
	dice?: string;
	/** Expression from t("common.expression") */
	expression?: string;
	/** Comments from t("common.comments") */
	comments?: string;
	/** User from t("display.userLowercase") */
	user?: string;
}

/**
 * Options extracted from a Discord command interaction for dice rolling.
 */
export interface RollInteractionOptions {
	/** The mathematical expression to add to the roll (default: "0") */
	expression: string;
	/** Optional threshold/comparator override */
	threshold?: string;
	/** Optional opposition value for contested rolls */
	oppositionVal?: string;
	/** User-provided comments for the roll */
	userComments?: string;
	/** Formatted comments string with # prefix if present */
	comments: string;
}

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

/**
 * Complete interaction context with locale, translation, and guild configuration.
 * Reduces repeated getLangAndConfig pattern throughout the codebase.
 */
export interface InteractionContext {
	/** Translation function for the interaction's locale */
	ul: Translation;
	/** Locale to use for this interaction */
	langToUse: Djs.Locale;
	/** Guild configuration if interaction is in a guild */
	config?: GuildData;
}
