/** biome-ignore-all lint/style/useNamingConvention: Until biome allow to set a specific rules for property of a global object, we stick against the naming convention */

import type { SortOrder } from "@dicelette/core";
import {
	generateStatsDice,
	isNumber,
	MIN_THRESHOLD_MATCH,
	REMOVER_PATTERN,
	replaceUnknown,
} from "@dicelette/core";
import type { Translation } from "@dicelette/types";
import { DICE_COMPILED_PATTERNS, logger } from "@dicelette/utils";
import { evaluate } from "mathjs";
import moment from "moment";
import { parseOpposition } from "./custom_critical";
import { FORMULA_BLOCK_PATTERN, findStatInDiceFormula, getRoll } from "./dice_extractor";
import type { AsciiSign } from "./interfaces";

/** Gets or creates a cached regex for stats filtering. */
function getStatsRegex(statNames: string[]): RegExp {
	const key = statNames.join("|");
	let regex = DICE_COMPILED_PATTERNS.STATS_REGEX_CACHE.get(key);
	if (!regex) {
		regex = new RegExp(
			`(${statNames.map((stat) => RegExp.escape(stat.standardize())).join("|")})`,
			"gi"
		);
		DICE_COMPILED_PATTERNS.STATS_REGEX_CACHE.set(key, regex);
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
	dollarValue?: string,
	unknownReplacer?: string
): string {
	if (isNumber(dice)) {
		const res = Number.parseInt(dice, 10);
		if (res > 0) return `+${res}`;
		if (res < 0) return `${res}`;
		return "";
	}
	dice = generateStatsDice(dice, statistics, MIN_THRESHOLD_MATCH, dollarValue);
	if (unknownReplacer) dice = replaceUnknown(dice, unknownReplacer);
	try {
		const evaluated = evaluate(dice);
		if (isNumber(evaluated)) return evaluated > 0 ? `+${evaluated}` : `${evaluated}`;
	} catch (error) {
		logger.warn(error as Error);
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

	// Detects parens containing one of the stat names; cached by signature since this is on the hot roll path.
	let regex = DICE_COMPILED_PATTERNS.STATS_PAREN_REGEX_CACHE.get(statName);
	if (!regex) {
		const escapedStatName = statName
			.split("|")
			.map((name) => RegExp.escape(name))
			.join("|");
		regex = new RegExp(`\\((${escapedStatName})\\)`, "gi");
		DICE_COMPILED_PATTERNS.STATS_PAREN_REGEX_CACHE.set(statName, regex);
	}
	regex.lastIndex = 0;
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
	let formule = DICE_COMPILED_PATTERNS.STATS_NAMED_REGEX_CACHE.get(statName);
	if (!formule) {
		const escapedStatName = Object.keys(statistics)
			.map((name) => RegExp.escape(name))
			.join("|");
		formule = new RegExp(`\\((?<formula>${escapedStatName})\\)`, "i");
		DICE_COMPILED_PATTERNS.STATS_NAMED_REGEX_CACHE.set(statName, formule);
	}
	const match = formule.exec(diceName.standardize());
	if (!match) return undefined;
	const { formula } = match.groups || {};
	if (!formula) return undefined;

	const result = generateStatsDice(formula, statistics, MIN_THRESHOLD_MATCH);
	const isRoll = getRoll(result);
	if (isRoll?.total !== undefined)
		return {
			diceResult: isRoll.result,
			total: isRoll.total.toString(),
		};
	return { total: result };
}

export function trimAll(dice: string) {
	const dices = dice.split(";");
	const result = dices.map((d) => {
		return `${d.replace(DICE_COMPILED_PATTERNS.COMMENTS_REGEX, "").trimAll()}`;
	});
	return result.join(";");
}

/** Formats a link to a Discord message (or `logUrl` if given), or an empty string if neither is available. */
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

/** Replaces `{exp}`/`{exp || default}` placeholders with the evaluated expression, or the default (default: "1") when `expression` is "0". */
export function getExpression(
	dice: string,
	expression: string,
	stats?: Record<string, number>,
	total?: string,
	statsName?: string[],
	replaceUnknown?: string
) {
	let expressionStr = convertExpression(expression, stats, total, replaceUnknown);
	let isExp = false;
	dice = dice.replace(
		DICE_COMPILED_PATTERNS.DICE_EXPRESSION,
		(_match, _p1, _p2, _offset, _string, groups) => {
			const defaultValue = groups?.default ?? "1";
			isExp = true;
			return expression === "0" ? defaultValue : expressionStr.replace(/^\+/, "");
		}
	);
	if (isExp) {
		dice = dice.replace(/([+-])0(?!\d)/g, "");
		expressionStr = "";
	}
	return {
		dice,
		expressionStr,
		statsFound: findStatInDiceFormula(expression, statsName),
	};
}

export function filterStatsInDamage(
	damages: Record<string, string>,
	statistics?: string[]
) {
	if (!statistics?.length) return Object.keys(damages);
	const regex = getStatsRegex(statistics);
	// Drops damage entries whose value matches the stat regex, returns the remaining keys.
	return Object.keys(damages).filter((key) => !damages[key].standardize().match(regex));
}

/** Finds a dice's opposition comparator (`1d20>15>20` → `>20`) and the dice without it. Critical/`{{...}}` blocks
 * are masked (not removed) so a comparator inside an unresolved block isn't mistaken for one, and offsets stay intact. */
export function extractOpposition(
	dice: string
): { dice: string; first: string; second: string } | undefined {
	const mask = (block: string) => "0".repeat(block.length);
	const masked = dice
		.replace(REMOVER_PATTERN.CRITICAL_BLOCK, mask)
		.replace(FORMULA_BLOCK_PATTERN, mask);
	const match = DICE_COMPILED_PATTERNS.OPPOSITION.exec(masked);
	if (!match?.groups) return undefined;
	const { first, second } = match.groups;
	const start = match.index + match[0].length - second.length;
	return {
		dice: `${dice.slice(0, start)}${dice.slice(start + second.length)}`.trim(),
		first: dice.slice(match.index, match.index + first.length),
		second: dice.slice(start, start + second.length),
	};
}

export function parseComparator(
	dice: string,
	userStatistique?: Record<string, number>,
	userStatStr?: string,
	sort?: SortOrder
) {
	const found = extractOpposition(dice);
	if (!found) return undefined;
	return parseOpposition(found.second, found.first, userStatistique, userStatStr, sort);
}

/** Early-return check for messages that are obviously not dice: empty, "_ _", a link, or starting with a character that can't lead a valid dice. */
export function isNotADice(content: string) {
	if (content.trim().length === 0 || content === "_ _" || content.startsWith("https://"))
		return true;
	// Strips a leading run of Discord markdown emphasis markers (*bold*, _italic_, ~~strike~~, ||spoiler||) first,
	// so a wrapped semi-direct roll (e.g. "*mon message [1d6]*") isn't rejected just for its styling marker.
	const unmarked = content.replace(/^[*_~|]+/, "");
	if (unmarked.trim().length === 0) return true;
	return !!unmarked.match(/^[|\\_`/¤!µ*>~\-#§:;.,?%£€"'&°=]/);
}

export function asciiSign(sign: string) {
	if (sign === "!=") return "≠";
	if (sign === "==") return "=";
	if (sign === ">=") return "⩾";
	if (sign === "<=") return "⩽";
	return sign;
}

export function goodSign(sign: string): AsciiSign {
	switch (sign) {
		case "<":
			return ">";
		case ">":
			return "<";
		case ">=":
			return "⩽";
		case "<=":
			return "⩾";
		case "=":
			return "!=";
		case "!=":
			return "==";
		case "==":
			return "!=";
		default:
			return "";
	}
}

export function goodSignToAscii(sign: string) {
	return asciiSign(goodSign(sign));
}
