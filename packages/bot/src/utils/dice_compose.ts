import { DETECT_CRITICAL, generateStatsDice } from "@dicelette/core";
import { trimAll } from "@dicelette/parse_result";
import { COMPILED_PATTERNS } from "@dicelette/utils";

/**
 * Extracts a comparator token (e.g. ">=12" or "<=5") from a dice string.
 * Executes the pattern regex only once and returns both the cleaned dice string
 * and the extracted comparator portion.
 *
 * @param dice - The dice string potentially containing a comparator
 * @param pattern - The regex pattern to match comparators (e.g. COMPILED_PATTERNS.COMPARATOR)
 * @returns Object with cleaned dice string and comparator (empty string if none found)
 *
 * @example
 * extractComparator("2d6>=10", COMPILED_PATTERNS.COMPARATOR)
 * // => { dice: "2d6", comparator: ">=10" }
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
 * Composes the final roll string by applying critical removal, threshold substitution,
 * comparator extraction and evaluation in a single, optimized pass.
 *
 * This centralizes duplicated logic previously present in `rollMacro`, `rollStatistique`,
 * and snippet execution, reducing regex operations and code duplication.
 *
 * @param dice - The dice formula string (may contain critical markers)
 * @param threshold - Optional threshold to override existing comparator
 * @param comparatorPattern - Regex pattern for extracting comparators
 * @param stats - User statistics for stat replacement (optional)
 * @param statTotal - Total stat value for $ replacement (optional)
 * @param expressionStr - Additional expression string to append
 * @param comments - Comments to append to the roll
 * @returns Object containing processed dice, raw/evaluated comparators, and final roll string
 *
 * @example
 * composeRollBase("2d6{cf:<=2}>=10", undefined, COMPILED_PATTERNS.COMPARATOR, {}, undefined, "+3", "")
 * // => { diceWithoutComparator: "2d6", rawComparator: ">=10", comparatorEvaluated: ">=10", roll: "2d6+3>=10 " }
 */
export function composeRollBase(
	dice: string,
	threshold: string | undefined,
	comparatorPattern: RegExp,
	stats: Record<string, number> | undefined,
	statTotal: string | number | undefined,
	expressionStr: string,
	comments: string
): {
	diceWithoutComparator: string;
	rawComparator: string;
	comparatorEvaluated: string;
	roll: string;
} {
	// Remove critical detection markers (already parsed elsewhere) and normalize whitespace
	let working = dice.replace(DETECT_CRITICAL, "").trim();

	// Apply threshold logic only once
	working = getThreshold(working, threshold);

	// Extract comparator using reusable helper
	const { dice: noComparator, comparator: rawComparator } = extractComparator(
		working,
		comparatorPattern
	);

	// Evaluate stats in comparator expression
	const comparatorEvaluated = generateStatsDice(
		rawComparator,
		stats,
		statTotal?.toString()
	);

	// Compose final roll string
	const roll = `${trimAll(noComparator)}${expressionStr}${comparatorEvaluated} ${comments}`;

	return {
		comparatorEvaluated,
		diceWithoutComparator: noComparator,
		rawComparator,
		roll,
	};
}

/**
 * Applies threshold override logic to a dice formula.
 * If threshold contains a full comparator expression (e.g. ">=15"), replaces any existing one.
 * If threshold is just a number and dice has a comparator, replaces only the numeric part.
 * Executes each regex at most once for optimal performance.
 *
 * @param dice - The dice formula potentially containing a comparator
 * @param threshold - Optional threshold value or full comparator expression
 * @returns Updated dice string with threshold applied
 *
 * @example
 * getThreshold("2d6>=10", ">=15") // => "2d6>=15"
 * getThreshold("2d6>=10", "12")   // => "2d6>=12"
 * getThreshold("2d6", ">=15")     // => "2d6>=15"
 */
export function getThreshold(dice: string, threshold?: string): string {
	// Early return if no threshold provided
	if (!threshold) return dice;

	const diceMatch = COMPILED_PATTERNS.COMPARATOR.exec(dice);
	const thresholdMatch = COMPILED_PATTERNS.COMPARATOR.exec(threshold);

	if (thresholdMatch) {
		// Threshold includes a full comparator expression (e.g. ">=15")
		if (diceMatch) return dice.replace(diceMatch[0], thresholdMatch[0]);
		return dice + thresholdMatch[0];
	}

	// Threshold does not supply comparator operator, treat as value override
	if (diceMatch?.groups) {
		const value = threshold.trim();
		if (value.length > 0) return dice.replace(diceMatch.groups.comparator, value);
	}

	return dice;
}
