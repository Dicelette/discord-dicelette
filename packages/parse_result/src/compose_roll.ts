import { DETECT_CRITICAL, generateStatsDice } from "@dicelette/core";
import { DICE_COMPILED_PATTERNS } from "@dicelette/utils";
import { trimAll } from "./utils";
import {MIN_THRESHOLD_MATCH} from "@dicelette/types";

/**
 * Extract a comparator token (e.g. ">=12" or "<=5") from a dice string.
 * Executes the pattern regex only once and returns both the cleaned dice string
 * and the extracted comparator portion.
 */
export function extractComparator(
	dice: string,
	pattern: RegExp
): { dice: string; comparator: string } {
	const match = pattern.exec(dice);
	if (!match) return { comparator: "", dice: dice.trim() };
	return { comparator: match[0], dice: dice.replace(match[0], "").trim() };
}

/**
 * Apply threshold override logic to a dice formula.
 * If threshold contains a full comparator expression (e.g. ">=15"), replaces any existing one.
 * If threshold is just a number and dice has a comparator, replaces only the numeric part.
 * Executes each regex at most once for optimal performance.
 */
export function getThreshold(dice: string, threshold?: string): string {
	if (!threshold) return dice;
	const diceMatch = DICE_COMPILED_PATTERNS.COMPARATOR.exec(dice);
	const thresholdMatch = DICE_COMPILED_PATTERNS.COMPARATOR.exec(threshold);
	if (thresholdMatch) {
		if (diceMatch) return dice.replace(diceMatch[0], thresholdMatch[0]);
		return dice + thresholdMatch[0];
	}
	if (diceMatch?.groups) {
		const value = threshold.trim();
		if (value.length > 0) return dice.replace(diceMatch.groups.comparator, value);
	}
	return dice;
}

/**
 * Compose the final roll string by applying critical removal, threshold substitution,
 * comparator extraction and evaluation in a single, optimized pass.
 * Centralizes duplicated logic from bot layer.
 */
export function composeRollBase(
	dice: string,
	threshold: string | undefined,
	comparatorPattern: RegExp,
	stats: Record<string, number> | undefined,
	statTotal: string | number | undefined,
	dollarValue: string,
	comments: string
): {
	diceWithoutComparator: string;
	rawComparator: string;
	comparatorEvaluated: string;
	roll: string;
} {
	let working = dice.replace(DETECT_CRITICAL, "").trim();
	working = getThreshold(working, threshold);
	working = generateStatsDice(working, stats, MIN_THRESHOLD_MATCH, statTotal?.toString());
	const { dice: noComparator, comparator: rawComparator } = extractComparator(
		working,
		comparatorPattern
	);
	const comparatorEvaluated = generateStatsDice(
		rawComparator,
		stats,
		MIN_THRESHOLD_MATCH,
		statTotal?.toString()
	);
	const roll = `${trimAll(noComparator)}${dollarValue}${comparatorEvaluated} ${comments}`;
	return {
		comparatorEvaluated,
		diceWithoutComparator: noComparator,
		rawComparator,
		roll,
	};
}
