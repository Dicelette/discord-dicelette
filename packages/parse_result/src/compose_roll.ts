import { DETECT_CRITICAL, generateStatsDice, MIN_THRESHOLD_MATCH } from "@dicelette/core";
import { DICE_COMPILED_PATTERNS } from "@dicelette/utils";
import { trimAll } from "./utils";

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
 * `generateStatsDice` (core) intentionally leaves `$stat` tokens inside `[...]` brackets untouched — that syntax is reserved for the custom-formula feature, which re-wraps the bracket in `{{...}}` afterwards.
 * But nothing resolves the `$stat` to a number before that wrapping (or at all, when no custom formula is configured), so the bracket reaches the roll engine as inert literal text and the comparator silently falls back to 0.
 * Resolve `$stat` inside brackets here, the same way it's already resolved outside of them.
 */
function resolveStatsInBrackets(
	dice: string,
	stats: Record<string, number> | undefined,
	statTotal: string | undefined
): string {
	if (!stats || !dice.includes("[")) return dice;
	return dice.replace(/\[([^\]]+)\]/g, (match, expr: string) => {
		if (!expr.includes("$")) return match;
		return `[${generateStatsDice(expr, stats, MIN_THRESHOLD_MATCH, statTotal)}]`;
	});
}

/**
 * Compose the final roll string by applying critical removal, threshold substitution,
 * comparator extraction and evaluation in a single, optimized pass.
 * Centralizes duplicated logic from bot layer.
 *
 * The comment (if any) is returned separately and should be passed directly to the
 * roll function rather than appended to the dice string, avoiding redundant strip/re-add cycles.
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
	comment: string | undefined;
} {
	let working = dice.replace(DETECT_CRITICAL, "").trim();
	working = getThreshold(working, threshold);
	working = resolveStatsInBrackets(working, stats, statTotal?.toString());
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
	const comment = comments.replace(/^#\s*/, "").trim() || undefined;
	const roll = `${trimAll(noComparator)}${dollarValue}${comparatorEvaluated}`;
	return {
		comment,
		comparatorEvaluated,
		diceWithoutComparator: noComparator,
		rawComparator,
		roll,
	};
}
