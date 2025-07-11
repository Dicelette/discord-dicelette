import { type Resultat, roll } from "@dicelette/core";
import {
	type ChainedComments,
	DICE_PATTERNS,
	type DiceData,
	type DiceExtractionResult,
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

export function processChainedDiceRoll(content: string): Resultat | undefined {
	const globalComments = content.match(DICE_PATTERNS.GLOBAL_COMMENTS)?.[1];
	let processedContent = content;
	if (globalComments)
		processedContent = content.replace(DICE_PATTERNS.GLOBAL_COMMENTS, "").trim();
	try {
		const rollResult = roll(processedContent);
		if (!rollResult) return undefined;
		rollResult.dice = processedContent;
		if (globalComments) rollResult.comment = globalComments;
		return rollResult;
	} catch (e) {
		logger.warn(e);
		return undefined;
	}
}

export function isRolling(content: string): DiceExtractionResult | undefined {
	const diceData = extractDiceData(content);
	if (diceData.bracketRoll) {
		const result = performDiceRoll(content, diceData.bracketRoll);
		if (result) return { result, detectRoll: diceData.bracketRoll };
	}

	if (content.includes("#") || (content.includes("&") && content.includes(";"))) {
		const result = processChainedDiceRoll(content);
		if (result) return { result, detectRoll: undefined };
	}
	if (hasValidDice(diceData)) {
		let { comments } = diceData;
		let processedContent = content;

		if (comments) {
			const chained = processChainedComments(content, comments);
			processedContent = chained.content;
			comments = chained.comments;
		}

		const result = performDiceRoll(processedContent, undefined);
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
