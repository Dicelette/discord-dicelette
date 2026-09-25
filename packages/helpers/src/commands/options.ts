import type { CustomCritical } from "@dicelette/core";
import { t } from "@dicelette/localization";
import { parseCustomCritical } from "@dicelette/parse_result";
import type { Translation } from "@dicelette/types";
import type * as Djs from "discord.js";
import type { CommonOptions, RollInteractionOptions } from "../interfaces";

/** Extracts commonly used interaction options (character, statistic, name, etc.) in a single call. */
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

/** Gets the character option, normalized and optionally lowercased. */
export function getCharacterOption(
	options: Djs.CommandInteractionOptionResolver,
	toLowerCase = true
): string | undefined {
	const char = options.getString(t("common.character"), false);
	if (!char) return undefined;
	const normalized = char.normalize();
	return toLowerCase ? normalized.toLowerCase() : normalized;
}

/** Gets the statistic option, standardized. */
export function getStatisticOption(
	options: Djs.CommandInteractionOptionResolver,
	required = false
): string | undefined {
	return options.getString(t("common.statistic"), required) ?? undefined;
}

/** Gets the name/skill option. */
export function getNameOption(
	options: Djs.CommandInteractionOptionResolver,
	required = false
): string | undefined {
	return options.getString(t("common.name"), required) ?? undefined;
}

function parseRollCriticalOption(
	value: string | undefined,
	name: string
): Record<string, CustomCritical> | undefined {
	if (!value) return undefined;
	let normalized = value.trimAll();
	if (/^-?\d+$/.test(normalized)) normalized = `==${normalized}`;
	return parseCustomCritical(name, normalized);
}

/** Extracts and normalizes roll options (expression, threshold, opposition, custom criticals, comments). */
export function extractRollOptions(
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation
): RollInteractionOptions {
	const expression = options.getString(t("common.expression")) ?? "0";
	const threshold = options.getString(t("dbRoll.options.override.name"))?.trimAll();
	const oppositionVal =
		options.getString(t("dbRoll.options.opposition.name")) ?? undefined;
	const customCriticalSuccess = parseRollCriticalOption(
		options.getString(t("roll.options.cs.name")) ?? undefined,
		ul("roll.critical.success")
	);
	const customCriticalFailure = parseRollCriticalOption(
		options.getString(t("roll.options.cf.name")) ?? undefined,
		ul("roll.critical.failure")
	);
	const customCritical =
		customCriticalSuccess || customCriticalFailure
			? Object.assign({}, customCriticalFailure ?? {}, customCriticalSuccess ?? {})
			: undefined;
	const userComments = options.getString(t("common.comments")) ?? undefined;
	const comments = userComments ? `# ${userComments}` : "";

	return {
		comments,
		expression,
		oppositionVal,
		threshold,
		customCritical,
		userComments,
	};
}
