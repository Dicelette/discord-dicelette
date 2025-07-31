import { type Resultat, roll } from "@dicelette/core";
import {
	type ChainedComments,
	DICE_PATTERNS,
	type DiceData,
	type DiceExtractionResult,
	type UserData,
} from "@dicelette/types";
import { logger } from "@dicelette/utils";
import { trimAll } from "./utils";

export function extractDiceData(content: string): DiceData {
	const bracketRoll = content.match(DICE_PATTERNS.BRACKET_ROLL)?.[1];
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
		const globalComments = content.match(DICE_PATTERNS.GLOBAL_COMMENTS)?.[1];
		if (globalComments) {
			content = content.replace(DICE_PATTERNS.GLOBAL_COMMENTS, "").trim();
			return { content, comments: globalComments };
		}

		return {
			content,
			comments: undefined,
		};
	}

	return {
		content: content.replace(DICE_PATTERNS.DETECT_DICE_MESSAGE, "$1"),
		comments: content.match(DICE_PATTERNS.GLOBAL_COMMENTS)?.[1] ?? comments,
	};
}

export function performDiceRoll(
	content: string,
	bracketRoll: string | undefined
): Resultat | undefined {
	try {
		const rollContent = bracketRoll ? trimAll(bracketRoll) : trimAll(content);
		return roll(rollContent);
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
): Resultat | undefined {
	// Process stats replacement if userData is available
	let processedContent = content;
	if (userData?.stats) {
		processedContent = replaceStatsInDiceFormula(content, userData.stats);
	}

	const globalComments = processedContent.match(DICE_PATTERNS.GLOBAL_COMMENTS)?.[1];
	let finalContent = processedContent;
	if (globalComments)
		finalContent = processedContent.replace(DICE_PATTERNS.GLOBAL_COMMENTS, "").trim();
	try {
		const rollResult = roll(finalContent);
		if (!rollResult) return undefined;
		rollResult.dice = finalContent;
		if (globalComments) rollResult.comment = globalComments;
		return rollResult;
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
	let processedContent = content;
	if (userData?.stats) {
		processedContent = replaceStatsInDiceFormula(content, userData.stats);
	}

	const diceData = extractDiceData(processedContent);
	if (diceData.bracketRoll) {
		const result = performDiceRoll(processedContent, diceData.bracketRoll);
		if (result) return { result, detectRoll: diceData.bracketRoll };
	}

	if (
		processedContent.includes("#") ||
		(processedContent.includes("&") && processedContent.includes(";"))
	) {
		const result = processChainedDiceRoll(processedContent, userData);
		if (result) return { result, detectRoll: undefined };
	}
	if (hasValidDice(diceData)) {
		let { comments } = diceData;
		let finalContent = processedContent;

		if (comments) {
			const chained = processChainedComments(processedContent, comments);
			finalContent = chained.content;
			comments = chained.comments;
		}

		const result = performDiceRoll(finalContent, undefined);
		if (!result) return undefined;
		if (result) applyCommentsToResult(result, comments, undefined);
		return { result, detectRoll: undefined };
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
function replaceStatsInDiceFormula(
	content: string,
	stats?: Record<string, number>
): string {
	if (!stats) return content;

	let comments = content.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3];
	let diceFormula = content;
	const statsFounds: string[] = [];
	if (comments) diceFormula = diceFormula.replace(comments, "").trim() ?? "";
	else comments = "";

	let processedFormula = diceFormula;

	const variableMatches = [...processedFormula.matchAll(/\$([a-zA-Z_][a-zA-Z0-9_]*)/gi)];

	for (const match of variableMatches) {
		const fullMatch = match[0];
		const searchTerm = match[1].toLowerCase();

		if (!processedFormula.includes(fullMatch)) continue;

		let foundStat: [string, number] | undefined;
		for (const [statKey, statValue] of Object.entries(stats)) {
			if (statKey.standardize().toLowerCase() === searchTerm) {
				foundStat = [statKey, statValue];
				break;
			}
		}

		// If no exact match, try partial matching
		if (!foundStat) {
			const candidates: Array<[string, number, number]> = [];

			for (const [statKey, statValue] of Object.entries(stats)) {
				const normalizedStatKey = statKey.standardize().toLowerCase();

				// Check if the search term matches the beginning of the stat name
				if (normalizedStatKey.startsWith(searchTerm)) {
					candidates.push([statKey, statValue, normalizedStatKey.length]);
				}
				// Check if the search term matches the end of the stat name
				else if (normalizedStatKey.endsWith(searchTerm)) {
					candidates.push([statKey, statValue, normalizedStatKey.length]);
				} else if (normalizedStatKey.includes(searchTerm)) {
					candidates.push([statKey, statValue, normalizedStatKey.length]);
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
			const regex = new RegExp(`${escapedMatch}(?=\\W|$)`, "g");
			processedFormula = processedFormula.replace(regex, statValue.toString());
		}
	}

	const uniqueStats = Array.from(new Set(statsFounds.filter((stat) => stat.length > 0)));
	if (uniqueStats.length > 0) {
		const statsList = uniqueStats.join(", ");
		comments = comments ? ` ⌈__${statsList}__⌋ ${comments} ` : ` ⌈__${statsList}__⌋`;
	}

	return `${processedFormula} ${comments}`;
}
