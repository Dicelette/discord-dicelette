import { t } from "@dicelette/localization";
import type * as Djs from "discord.js";
import type { CommonOptions, RollInteractionOptions } from "../interfaces";

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
		comments: options.getString(t("common.comments"), required?.comments) ?? undefined,
		dice: options.getString(t("common.dice"), required?.dice) ?? undefined,
		expression:
			options.getString(t("common.expression"), required?.expression) ?? undefined,
		name: options.getString(t("common.name"), required?.name) ?? undefined,
		statistic: options.getString(t("common.statistic"), required?.statistic) ?? undefined,
		user: options.getUser(t("display.userLowercase"), required?.user) ?? undefined,
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

/**
 * Extracts and normalizes common roll-related options from a Discord command interaction.
 * Centralizes the repetitive option extraction logic present in rollMacro, rollStatistique,
 * and snippet commands.
 *
 * @param options - The command interaction options resolver
 * @returns Normalized roll options object
 *
 * @example
 * const opts = extractRollOptions(interaction.options);
 * // => { expression: "0", threshold: ">=15", oppositionVal: "12", userComments: "test", comments: "# test" }
 */
export function extractRollOptions(
	options: Djs.CommandInteractionOptionResolver
): RollInteractionOptions {
	const expression = options.getString(t("common.expression")) ?? "0";
	const threshold = options.getString(t("dbRoll.options.override.name"))?.trimAll();
	const oppositionVal =
		options.getString(t("dbRoll.options.opposition.name")) ?? undefined;
	const userComments = options.getString(t("common.comments")) ?? undefined;

	// Format comments with # prefix if present
	const comments = userComments ? `# ${userComments}` : "";

	return {
		comments,
		expression,
		oppositionVal,
		threshold,
		userComments,
	};
}
