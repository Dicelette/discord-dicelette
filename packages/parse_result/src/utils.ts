/** biome-ignore-all lint/style/useNamingConvention: Until biome allow to set a specific rules for property of a global object, we stick against the naming convention */
import { generateStatsDice, isNumber } from "@dicelette/core";
import type { Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import { evaluate } from "mathjs";
import moment from "moment";
import { parseOpposition } from "./custom_critical";
import { getRoll } from "./dice_extractor";

// Pre-compiled regex patterns for better performance
const COMPILED_PATTERNS = {
	COMMENTS_REGEX: /\[([^\]]*)\]/,
	DICE_EXPRESSION: /\{exp( ?\|\| ?(?<default>\d+))?\}/gi,
	STATS_REGEX_CACHE: new Map<string, RegExp>(),
} as const;

/**
 * Get or create cached regex for stats filtering
 */
function getStatsRegex(statNames: string[]): RegExp {
	const key = statNames.join("|");
	let regex = COMPILED_PATTERNS.STATS_REGEX_CACHE.get(key);
	if (!regex) {
		regex = new RegExp(
			`(${statNames.map((stat) => stat.standardize()).join("|")})`,
			"gi"
		);
		COMPILED_PATTERNS.STATS_REGEX_CACHE.set(key, regex);
	}
	return regex;
}

export function timestamp(time?: boolean) {
	if (time) return ` • <t:${moment().unix()}:d>-<t:${moment().unix()}:t>`;
	return "";
}

export function convertExpression(
	dice: string,
	statistics?: Record<string, number>,
	dollarValue?: string
): string {
	if (isNumber(dice)) {
		const res = Number.parseInt(dice, 10);
		if (res > 0) return `+${res}`;
		if (res < 0) return `${res}`;
		return "";
	}
	dice = generateStatsDice(dice, statistics, dollarValue);
	try {
		const evaluated = evaluate(dice);
		if (typeof evaluated === "number")
			return evaluated > 0 ? `+${evaluated}` : `${evaluated}`;
	} catch (error) {
		//pass
		logger.warn(error);
	}
	if (!dice.startsWith("+") && !dice.startsWith("-")) return `+${dice}`;
	return dice;
}

export function replaceStatInDiceName(
	diceName: string,
	statistics?: Record<string, number>,
	customReplacement?: string
) {
	const originalDice = diceName;
	const statName = Object.keys(statistics ?? {})
		.map((key) => key.removeAccents().toLowerCase())
		.join("|");
	if (!statName) return originalDice;

	// Regex to detect parentheses with content matching one of the names in “statName”
	const regex = new RegExp(`\\((${statName})\\)`, "gi");
	const standardizedDice = originalDice.standardize();
	const match = regex.exec(standardizedDice);
	if (!match) return originalDice;
	const startIndex = standardizedDice.indexOf(match[0]);
	const endIndex = startIndex + match[0].length;
	const statKey = match[1].removeAccents().toLowerCase().trim();
	const replacementValue = customReplacement ?? statistics?.[statKey];

	if (replacementValue === undefined) return originalDice;
	let result: string;
	if (replacementValue?.toString().length === 0)
		result = originalDice.slice(0, startIndex) + originalDice.slice(endIndex);
	else
		result = `${originalDice.slice(0, startIndex)}(${replacementValue})${originalDice.slice(endIndex)}`;

	return result.trim();
}

export function convertNameToValue(
	diceName: string,
	statistics?: Record<string, number>
): Partial<{ total: string; diceResult: string }> | undefined {
	if (!statistics) return undefined;
	const statName = Object.keys(statistics).join("|");
	const formule = new RegExp(`\\((?<formula>${statName})\\)`, "i");
	const match = formule.exec(diceName.standardize());
	if (!match) return undefined;
	const { formula } = match.groups || {};
	if (!formula) return undefined;

	const result = generateStatsDice(formula, statistics);
	const isRoll = getRoll(result);
	if (isRoll?.total)
		return {
			diceResult: isRoll.result,
			total: isRoll.total.toString(),
		};
	return { total: result };
}

export function trimAll(dice: string) {
	const dices = dice.split(";");
	const result = dices.map((d) => {
		const comment = d.match(COMPILED_PATTERNS.COMMENTS_REGEX)?.groups?.comment
			? `[${d.match(COMPILED_PATTERNS.COMMENTS_REGEX)?.groups?.comment}]`
			: "";
		return `${d.replace(COMPILED_PATTERNS.COMMENTS_REGEX, "").trimAll()}${comment}`;
	});
	return result.join(";");
}

/**
 * Generates a formatted URL string linking to a Discord message or a provided log URL.
 *
 * If a {@link logUrl} is given, returns it as a formatted string. Otherwise, if {@link context} is provided, returns a markdown link to the Discord message using the supplied IDs. Returns an empty string if neither is provided.
 *
 * @param ul - Translation function for localizing the link text.
 * @param context - Optional Discord message context containing guild, channel, and message IDs.
 * @param logUrl - Optional direct log URL to use instead of constructing a Discord link.
 * @returns A formatted string containing the appropriate URL or an empty string.
 */
export function createUrl(
	ul: Translation,
	context?: { guildId: string; channelId: string; messageId: string },
	logUrl?: string
) {
	if (logUrl) return `\n\n-# ↪ ${logUrl}`;
	if (!context) return "";
	const { guildId, channelId, messageId } = context;
	return `\n\n-# ↪ [${ul("common.context")}](<https://discord.com/channels/${guildId}/${channelId}/${messageId}>)`;
}

/**
 * Replaces `{exp}` or `{exp || default}` placeholders in a dice string with an evaluated expression or a default value.
 *
 * If the provided {@link expression} evaluates to `"0"`, placeholders are replaced with the specified default value (or `"1"` if not provided). Otherwise, placeholders are replaced with the evaluated expression string (without a leading plus sign). If any replacement occurs, the returned `expressionStr` is set to an empty string.
 *
 * @param dice - The dice string containing `{exp}` or `{exp || default}` placeholders.
 * @param expression - The expression to evaluate and insert into the dice string.
 * @param stats - Optional statistics used for evaluating the expression.
 * @param total - Optional value used in expression evaluation.
 * @returns An object with the updated dice string and the evaluated expression string.
 */
export function getExpression(
	dice: string,
	expression: string,
	stats?: Record<string, number>,
	total?: string
) {
	let expressionStr = convertExpression(expression, stats, total);
	let isExp = false;
	dice = dice.replace(
		COMPILED_PATTERNS.DICE_EXPRESSION,
		(_match, _p1, _p2, _offset, _string, groups) => {
			const defaultValue = groups?.default ?? "1";
			isExp = true;
			const replacement =
				expression === "0" ? defaultValue : expressionStr.replace(/^\+/, "");
			return replacement;
		}
	);
	if (isExp) {
		dice = dice.replace(/([+-])0(?!\d)/g, "");
		expressionStr = "";
	}
	return { dice, expressionStr };
}

export function filterStatsInDamage(
	damages: Record<string, string>,
	statistics?: string[]
) {
	if (!statistics || !statistics.length) return Object.keys(damages);
	const regex = getStatsRegex(statistics);
	//remove all damage value that match the regex and return the key
	return Object.keys(damages).filter((key) => !damages[key].standardize().match(regex));
}

export function parseComparator(
	dice: string,
	userStatistique?: Record<string, number>,
	userStatStr?: string
) {
	// Ignore les blocs de critiques personnalisés lors de la détection
	const criticalBlock = /\{\*?c[fs]:[<>=!]+.+?}/gim;
	const cleanedDice = dice.replace(criticalBlock, "");
	const comparatorMatch = /(?<first>([><=!]+)(.+?))(?<second>([><=!]+)(.+))/.exec(
		cleanedDice
	);
	let comparator = "";
	let opposition: string | undefined;
	if (comparatorMatch?.groups) {
		comparator = comparatorMatch.groups?.first;
		opposition = comparatorMatch.groups?.second;
	}
	if (opposition)
		return parseOpposition(opposition, comparator, userStatistique, userStatStr);
	return undefined;
}
