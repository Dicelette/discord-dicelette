import { t } from "@dicelette/localization";
import type * as Djs from "discord.js";

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
