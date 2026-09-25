import { DETECT_CRITICAL, generateStatsDice, MIN_THRESHOLD_MATCH } from "@dicelette/core";
import { DICE_COMPILED_PATTERNS } from "@dicelette/utils";
import { trimAll } from "./utils";

/** Extracts a comparator token (e.g. ">=12") from a dice string in a single regex pass. */
export function extractComparator(
	dice: string,
	pattern: RegExp
): { dice: string; comparator: string } {
	const match = pattern.exec(dice);
	if (!match) return { comparator: "", dice: dice.trim() };
	return { comparator: match[0], dice: dice.replace(match[0], "").trim() };
}

/** Applies a threshold override to a dice formula: a full comparator (">=15") replaces any existing one; a bare
 * number replaces just the numeric part of an existing comparator. */
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

/** `generateStatsDice` (core) leaves `$stat` tokens inside `[...]` untouched (reserved for the custom-formula
 * feature); this resolves them the same way they're resolved outside brackets. */
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

/** Composes the final roll string: critical removal, threshold substitution, comparator extraction/evaluation
 * in one pass. The comment (if any) is returned separately, to pass directly to the roll function. */
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
