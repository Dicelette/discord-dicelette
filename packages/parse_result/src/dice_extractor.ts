import { type Resultat, roll, SIGN_REGEX } from "@dicelette/core";
import {
	type ChainedComments,
	DICE_PATTERNS,
	type DiceData,
	type DiceExtractionResult,
	type UserData,
} from "@dicelette/types";
import { logger } from "@dicelette/utils";
import { trimAll } from "./utils";

// Cache for compiled regex patterns to improve performance
const regexCache = new Map<string, RegExp>();

/**
 * Get or create a cached regex pattern
 */
function getCachedRegex(pattern: string, flags = ""): RegExp {
	const key = `${pattern}|${flags}`;
	let regex = regexCache.get(key);
	if (!regex) {
		regex = new RegExp(pattern, flags);
		regexCache.set(key, regex);
	}
	return regex;
}

// Pre-compiled frequently used regex patterns
const COMPILED_PATTERNS = {
	VARIABLE_MATCHER: /\$([a-zA-Z_][a-zA-Z0-9_]*)/gi,
	CRITICAL_BLOCK: /\{\*?c[fs]:[<>=!]+.+?\}/gim,
	OPPOSITION_MATCHER: /(?<first>([><=!]+)(.+?))(?<second>([><=!]+)(.+))/,
	ASTERISK_ESCAPE: /\*/g,
	STAT_COMMENTS_REMOVER: /%%.*%%/,
	AT_MENTION_REMOVER: / @\w+/,
	SIGN_REMOVER: /[><=!]+.*$/,
	EXP_REMOVER: /\{exp.*?\}/g,
} as const;

export function extractDiceData(content: string): DiceData {
	const bracketRoll = content
		.replace(/%%.*%%/, "")
		.match(DICE_PATTERNS.BRACKET_ROLL)?.[1];
	const comments = content
		.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3]
		?.replaceAll("*", "\\*");
	const diceValue = content.match(DICE_PATTERNS.DICE_VALUE);

	return {
		bracketRoll,
		comments,
		diceValue,
	};
}

export function hasValidDice(diceData: DiceData): boolean {
	const { bracketRoll, comments, diceValue } = diceData;
	if (comments && !bracketRoll) return !!diceValue;
	return true;
}

function getComments(content: string, comments?: string) {
	let globalComments = content.match(DICE_PATTERNS.GLOBAL_COMMENTS)?.[1];
	if (!globalComments && !comments)
		globalComments = content.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3];
	if (comments && !globalComments) globalComments = comments;

	const statValue = content.match(DICE_PATTERNS.INFO_STATS_COMMENTS);
	if (statValue)
		globalComments =
			statValue[0] +
			(globalComments
				? ` ${globalComments.replace(DICE_PATTERNS.INFO_STATS_COMMENTS, "").trim()}`
				: "");

	return globalComments;
}

export function processChainedComments(
	content: string,
	comments: string
): ChainedComments {
	if (
		comments.match(DICE_PATTERNS.BRACKETED_COMMENTS) &&
		content.includes("&") &&
		content.includes(";")
	) {
		content = content.match(DICE_PATTERNS.BRACKETED_CONTENT)
			? content.replace(DICE_PATTERNS.BRACKETED_CONTENT, "$1").trim()
			: content;
		const globalComments = getComments(content);
		content = content
			.replace(/%%.*%%/, "")
			.trim()
			.replace(DICE_PATTERNS.GLOBAL_COMMENTS, "")
			.trim();

		return {
			content,
			comments: globalComments ?? undefined,
		};
	}

	const finalContent = content
		.replace(DICE_PATTERNS.DETECT_DICE_MESSAGE, "$1")
		.replace(/%%.*%%/, "")
		.trimEnd();

	return {
		content: finalContent,
		comments: getComments(content, comments),
	};
}

export function performDiceRoll(
	content: string,
	bracketRoll: string | undefined,
	userData?: UserData
): { resultat: Resultat | undefined; infoRoll?: string } | undefined {
	try {
		let rollContent = bracketRoll ? trimAll(bracketRoll) : trimAll(content);
		let infoRoll: string | undefined;
		if (userData?.stats) {
			const res = replaceStatsInDiceFormula(rollContent, userData.stats, true);
			rollContent = res.formula;
			infoRoll = res.infoRoll;
		}
		rollContent = rollContent.replace(/ @\w+/, "").trimEnd();
		return { resultat: roll(rollContent), infoRoll };
	} catch (e) {
		logger.warn(e);
		return undefined;
	}
}

export function applyCommentsToResult(
	result: Resultat,
	comments: string | undefined,
	bracketRoll: string | undefined
): Resultat {
	if (comments && !bracketRoll) {
		result.dice = `${result.dice} /* ${comments} */`;
		result.comment = comments;
	}
	return result;
}

export function processChainedDiceRoll(
	content: string,
	userData?: UserData
): { resultat: Resultat; infoRoll?: string } | undefined {
	// Process stats replacement if userData is available
	let processedContent = content;
	let infoRoll: string | undefined;
	if (userData?.stats) {
		const res = replaceStatsInDiceFormula(content, userData.stats, false, true);
		processedContent = res.formula;
		infoRoll = res.infoRoll;
	}

	const globalComments = getComments(content);

	const finalContent = processedContent
		.replace(DICE_PATTERNS.GLOBAL_COMMENTS, "")
		.trim()
		.replace(/%%.*%%/, "")
		.trim();

	try {
		// Remove critical blocks before rolling
		const cleaned = finalContent.replace(COMPILED_PATTERNS.CRITICAL_BLOCK, "");
		const rollResult = roll(cleaned);
		if (!rollResult) return undefined;
		rollResult.dice = cleaned;
		if (globalComments) rollResult.comment = globalComments;
		return { resultat: rollResult, infoRoll };
	} catch (e) {
		logger.warn(e);
		return undefined;
	}
}

export function isRolling(
	content: string,
	userData?: UserData
): DiceExtractionResult | undefined {
	// Process stats replacement if userData is available
	let processedContent: string;
	// Preclean to ignore {cs|cf:...} blocs
	const contentForOpposition = content.replace(COMPILED_PATTERNS.CRITICAL_BLOCK, "");
	const reg = /(?<first>([><=!]+)(.+?))(?<second>([><=!]+)(.+))/.exec(
		contentForOpposition
	);
	if (reg?.groups) content = content.replace(reg.groups.second, "").trim();

	let res = { formula: content };
	if (userData?.stats) res = replaceStatsInDiceFormula(content, userData.stats);
	processedContent = res.formula;

	const diceData = extractDiceData(processedContent);

	if (diceData.bracketRoll) {
		const cleanedForRoll = processedContent.replace(COMPILED_PATTERNS.CRITICAL_BLOCK, "");
		const diceRoll = performDiceRoll(cleanedForRoll, diceData.bracketRoll, userData);
		if (diceRoll?.resultat)
			return {
				result: diceRoll.resultat,
				detectRoll: diceData.bracketRoll,
				infoRoll: diceRoll.infoRoll,
			};
	}

	if (
		processedContent.includes("#") ||
		(processedContent.includes("&") && processedContent.includes(";"))
	) {
		const diceRoll = processChainedDiceRoll(
			processedContent.replace(COMPILED_PATTERNS.CRITICAL_BLOCK, ""),
			userData
		);
		if (diceRoll)
			return {
				result: diceRoll.resultat,
				detectRoll: undefined,
				infoRoll: diceRoll.infoRoll,
			};
	}
	if (hasValidDice(diceData)) {
		let { comments } = diceData;
		let finalContent = processedContent;

		if (comments) {
			const chained = processChainedComments(processedContent, comments);
			finalContent = chained.content;
			comments = chained.comments;
		}

		finalContent = finalContent.replace(COMPILED_PATTERNS.CRITICAL_BLOCK, "");

		const diceRoll = performDiceRoll(finalContent, undefined, userData);
		if (!diceRoll?.resultat || !diceRoll.resultat.result.length) return undefined;
		if (diceRoll) applyCommentsToResult(diceRoll.resultat, comments, undefined);
		return { result: diceRoll.resultat, detectRoll: undefined };
	}

	return undefined;
}

function getRollInShared(dice: string) {
	const main = DICE_PATTERNS.GLOBAL_COMMENTS_GROUP.exec(dice)?.groups?.comment;
	dice = dice.replace(DICE_PATTERNS.GLOBAL_COMMENTS_GROUP, "");
	const rollDice = roll(dice);
	if (!rollDice) return undefined;

	rollDice.dice = dice;
	if (main) rollDice.comment = main;
	return rollDice;
}

export function getRoll(dice: string): Resultat | undefined {
	if (dice.includes(";")) return getRollInShared(dice);
	const comments = dice
		.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3]
		.replaceAll("*", "\\*");
	if (comments) {
		dice = dice.replace(DICE_PATTERNS.DETECT_DICE_MESSAGE, "$1");
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

/**
 * Replaces stat variables like $force, $dexterity in dice formulas (excluding comments)
 * Supports partial matching: $sag will match "sagesse", $dex will match "dexterite"
 */
export function replaceStatsInDiceFormula(
	content: string,
	stats?: Record<string, number>,
	deleteComments = false,
	shared = false
): { formula: string; infoRoll?: string } {
	if (!stats) return { formula: content };
	//remove secondary opposition

	let comments = content.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3];
	let diceFormula = content;
	const statsFounds: string[] = [];
	if (comments) diceFormula = diceFormula.replace(comments, "").trim() ?? "";
	else comments = "";

	let processedFormula = diceFormula;

	const variableMatches = [
		...processedFormula.matchAll(COMPILED_PATTERNS.VARIABLE_MATCHER),
	];

	// Pre-process stats for better performance
	const normalizedStats = new Map<string, [string, number]>();
	for (const [key, value] of Object.entries(stats)) {
		const normalized = key.standardize().toLowerCase();
		normalizedStats.set(normalized, [key, value]);
	}

	for (const match of variableMatches) {
		const fullMatch = match[0];
		const searchTerm = match[1].toLowerCase();

		if (!processedFormula.includes(fullMatch)) continue;

		// First try exact match
		let foundStat = normalizedStats.get(searchTerm);

		// If no exact match, try partial matching
		if (!foundStat) {
			const candidates: Array<[string, number, number]> = [];

			for (const [normalizedKey, [originalKey, value]] of normalizedStats) {
				// Optimized: Check if the search term matches the beginning/end/contains of the stat name
				if (normalizedKey.startsWith(searchTerm)) {
					candidates.push([originalKey, value, normalizedKey.length]);
				} else if (normalizedKey.endsWith(searchTerm)) {
					candidates.push([originalKey, value, normalizedKey.length]);
				} else if (normalizedKey.includes(searchTerm)) {
					candidates.push([originalKey, value, normalizedKey.length]);
				}
			}

			if (candidates.length > 0) {
				candidates.sort((a, b) => a[2] - b[2]);
				foundStat = [candidates[0][0], candidates[0][1]];
			}
		}

		if (foundStat) {
			const [, statValue] = foundStat;
			statsFounds.push(foundStat[0].capitalize());
			const escapedMatch = fullMatch.replace(/\$/g, "\\$");
			const regex = getCachedRegex(`${escapedMatch}(?=\\W|$)`, "g");
			processedFormula = processedFormula.replace(regex, statValue.toString());
		}
	}

	const uniqueStats = Array.from(new Set(statsFounds.filter((stat) => stat.length > 0)));
	if (uniqueStats.length > 0) {
		const statsList = uniqueStats.join(", ");
		comments = comments
			? ` %%[__${statsList}__]%% ${comments} `
			: ` %%[__${statsList}__]%% `;
		if (shared) comments = `#${comments}`;
	}
	if (deleteComments) return { formula: processedFormula, infoRoll: uniqueStats[0] };
	return { formula: `${processedFormula} ${comments}`, infoRoll: uniqueStats[0] };
}

export function includeDiceType(dice: string, diceType?: string, userStats?: boolean) {
	if (!diceType) return false;
	if (userStats && diceType.includes("$")) {
		//replace the $ in the diceType by a regex (like .+?)
		diceType = diceType.replace("$", ".+?");
	}
	if (SIGN_REGEX.test(diceType)) {
		//remove it from the diceType and the value after it like >=10 or <= 5 to prevent errors
		diceType = diceType.replace(COMPILED_PATTERNS.SIGN_REMOVER, "").trim();
		dice = dice.replace(COMPILED_PATTERNS.SIGN_REMOVER, "").trim();
	}
	//also prevent error with the {exp} value
	if (diceType.includes("{exp")) {
		diceType = diceType.replace(COMPILED_PATTERNS.EXP_REMOVER, "").trim();
		dice = dice.replace(COMPILED_PATTERNS.EXP_REMOVER, "").trim();
	}
	const detectDiceType = getCachedRegex(`\\b${diceType}\\b`, "i");
	return detectDiceType.test(dice);
}
