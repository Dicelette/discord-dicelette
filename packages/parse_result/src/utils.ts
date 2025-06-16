import { generateStatsDice, isNumber, type Resultat, roll } from "@dicelette/core";
import type { Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import { evaluate } from "mathjs";
import moment from "moment";
import { DETECT_DICE_MESSAGE } from "./interfaces";

export function timestamp(time?: boolean) {
	if (time) return ` • <t:${moment().unix()}:d>-<t:${moment().unix()}:t>`;
	return "";
}

function getRollInShared(dice: string) {
	const mainComments = /# ?(?<comment>.*)/i;
	const main = mainComments.exec(dice)?.groups?.comment;
	dice = dice.replace(mainComments, "");
	const rollDice = roll(dice);
	if (!rollDice) {
		return undefined;
	}
	rollDice.dice = dice;
	if (main) rollDice.comment = main;
	return rollDice;
}

export function getRoll(dice: string): Resultat | undefined {
	if (dice.includes(";")) return getRollInShared(dice);
	const comments = dice.match(DETECT_DICE_MESSAGE)?.[3].replaceAll("*", "\\*");
	if (comments) {
		dice = dice.replace(DETECT_DICE_MESSAGE, "$1");
	}
	dice = dice.trim();
	try {
		const rollDice = roll(dice);
		if (!rollDice) return undefined;
		if (comments) {
			rollDice.comment = comments;
			rollDice.dice = `${dice} /* ${comments} */`;
		}
		return rollDice;
	} catch (error) {
		logger.warn(error);
		return undefined;
	}
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

export function replaceStatInDice(
	diceName: string,
	statistics?: Record<string, number>,
	customReplacement?: string
) {
	const originalDice = diceName;
	const statName = Object.keys(statistics ?? {})
		.map((key) => key.removeAccents().toLowerCase())
		.join("|");
	if (!statName) return originalDice;

	// Regex pour détecter les parenthèses avec un contenu matchant un des noms dans "statName"
	const regex = new RegExp(`\\((${statName})\\)`, "gi");

	// Standardiser le texte du dé pour trouver l'emplacement du match
	const standardizedDice = originalDice.standardize();
	const match = regex.exec(standardizedDice);
	if (!match) return originalDice;

	// Calculer l'emplacement du match dans le texte original
	const startIndex = standardizedDice.indexOf(match[0]);
	const endIndex = startIndex + match[0].length;

	// Utiliser le remplacement personnalisé ou la valeur statistique
	const statKey = match[1].removeAccents().toLowerCase().trim();
	const replacementValue = customReplacement ?? statistics?.[statKey];

	if (replacementValue === undefined) return originalDice;

	// Remplacer uniquement l'emplacement correspondant dans le texte original
	let result: string;
	if (replacementValue?.toString().length === 0)
		result = originalDice.slice(0, startIndex) + originalDice.slice(endIndex);
	else
		result = `${originalDice.slice(0, startIndex)}(${replacementValue})${originalDice.slice(endIndex)}`;

	return result.trim(); // Nettoyer les espaces résiduels
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
			total: isRoll.total.toString(),
			diceResult: isRoll.result,
		};
	return { total: result };
}

export function trimAll(dice: string) {
	const commentsReg = /\[(?<comment>.*)\]/;
	const dices = dice.split(";");
	const result = dices.map((d) => {
		const comment = d.match(commentsReg)?.groups?.comment
			? `[${d.match(commentsReg)?.groups?.comment}]`
			: "";
		return `${d.replace(commentsReg, "").trimAll()}${comment}`;
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
	const diceRegex = /\{exp( ?\|\| ?(?<default>\d+))?}/gi;
	let isExp = false;
	dice = dice.replace(diceRegex, (_match, _p1, _p2, _offset, _string, groups) => {
		const defaultValue = groups?.default ?? "1";
		isExp = true;
		return expression === "0" ? defaultValue : expressionStr.replace(/^\+/, "");
	});
	if (isExp) expressionStr = "";
	return { dice, expressionStr };
}

export function filterStatsInDamage(
	damages: Record<string, string>,
	statistics?: string[]
) {
	if (!statistics || !statistics.length) return Object.keys(damages);
	const regex = new RegExp(
		`(${statistics.map((stat) => stat.standardize()).join("|")})`,
		"gi"
	);
	//remove all damage value that match the regex and return the key
	return Object.keys(damages).filter((key) => !damages[key].standardize().match(regex));
}
