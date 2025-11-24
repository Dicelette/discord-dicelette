import { t } from "@dicelette/localization";
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
 * Extract commonly used interaction options in a single call.
 * Simplifies the common pattern of repeatedly calling options.getString(t(...)).
 *
 * @param options - Command interaction option resolver
 * @param required - Specify which options are required (will use getString(key, true))
 * @returns Object containing all requested options
 *
 * @example
 * // Before:
 * const char = options.getString(t("common.character"));
 * const stat = options.getString(t("common.statistic"));
 * const name = options.getString(t("common.name"));
 *
 * // After:
 * const { character, statistic, name } = extractCommonOptions(options);
 */
export function extractCommonOptions(
	options: Djs.CommandInteractionOptionResolver,
	required?: {
		character?: boolean;
		statistic?: boolean;
		name?: boolean;
		dice?: boolean;
		expression?: boolean;
		comments?: boolean;
		user?: boolean;
	}
): CommonOptions {
	return {
		character: options.getString(t("common.character"), required?.character) ?? undefined,
		statistic: options.getString(t("common.statistic"), required?.statistic) ?? undefined,
		name: options.getString(t("common.name"), required?.name) ?? undefined,
		dice: options.getString(t("common.dice"), required?.dice) ?? undefined,
		expression:
			options.getString(t("common.expression"), required?.expression) ?? undefined,
		comments: options.getString(t("common.comments"), required?.comments) ?? undefined,
		user:
			options.getString(t("display.userLowercase"), required?.user) ??
			options.get(t("display.userLowercase"))?.value?.toString() ??
			undefined,
	};
}

/**
 * Get character option with common transformations applied.
 * Handles normalization and lowercasing automatically.
 *
 * @param options - Command interaction option resolver
 * @param toLowerCase - Whether to convert to lowercase (default: true)
 * @returns Normalized character name or undefined
 */
export function getCharacterOption(
	options: Djs.CommandInteractionOptionResolver,
	toLowerCase = true
): string | undefined {
	const char = options.getString(t("common.character"), false);
	if (!char) return undefined;
	const normalized = char.normalize();
	return toLowerCase ? normalized.toLowerCase() : normalized;
}

/**
 * Get statistic option with standardization.
 *
 * @param options - Command interaction option resolver
 * @param required - Whether the option is required
 * @returns Statistic name (or standardized version)
 */
export function getStatisticOption(
	options: Djs.CommandInteractionOptionResolver,
	required = false
): string | undefined {
	return options.getString(t("common.statistic"), required) ?? undefined;
}

/**
 * Get name/skill option.
 *
 * @param options - Command interaction option resolver
 * @param required - Whether the option is required
 * @returns Name/skill value
 */
export function getNameOption(
	options: Djs.CommandInteractionOptionResolver,
	required = false
): string | undefined {
	return options.getString(t("common.name"), required) ?? undefined;
}
