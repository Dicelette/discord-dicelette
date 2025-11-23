import { DICE_PATTERNS } from "@dicelette/utils";
import { extractDiceData, getComments } from "./dice_extractor";

/**
 * Extract and merge comments from multiple sources (dice formula, user input)
 * Handles stat markers (%%[__stat__]%%), deduplicates comments, and formats
 * for shared vs single dice rolls.
 *
 * @param dice - The dice formula string potentially containing comments
 * @param userComments - Optional user-provided comments to merge
 * @returns Object with cleaned dice string and merged comments
 *
 * @example
 * extractAndMergeComments("2d6 # attack", "damage roll")
 * // => { cleanedDice: "2d6", mergedComments: "# attack damage roll" }
 */
export function extractAndMergeComments(
	dice: string,
	userComments?: string
): { cleanedDice: string; mergedComments?: string } {
	const isShared = dice.includes(";");
	const globalRaw = getComments(dice);
	const diceData = extractDiceData(dice);
	let tailComments = diceData.comments;

	// Avoid duplicate if tail equals global
	if (tailComments && globalRaw && tailComments === globalRaw) tailComments = undefined;

	/**
	 * Strip # prefix and trim whitespace from comment string
	 */
	function stripMeta(c?: string): string | undefined {
		if (!c) return undefined;
		return c.replace(/^# ?/, "").trim();
	}

	const partsRaw = [globalRaw, tailComments, userComments];
	const statsMarkers: string[] = [];
	const commentTexts: string[] = [];

	// Extract stat markers and clean comment text from all sources
	for (const part of partsRaw) {
		if (!part || !part.trim().length) continue;
		const markers = part.match(/%%\[__.*?__]%%/g) ?? [];
		for (const m of markers) if (!statsMarkers.includes(m)) statsMarkers.push(m);
		const cleanedPart = stripMeta(part.replace(/%%\[__.*?__]%%/g, "").trim());
		if (cleanedPart && cleanedPart.length > 0) commentTexts.push(cleanedPart);
	}

	// Deduplicate comment texts
	const uniqueComments: string[] = [];
	for (const c of commentTexts) {
		if (!uniqueComments.includes(c)) uniqueComments.push(c);
	}

	let merged = `${statsMarkers.join(" ")} ${uniqueComments.join(" ")}`.trim();
	if (merged.length === 0) merged = "";

	// Clean dice formula by removing all comment markers
	let cleaned = dice
		.replace(/%%\[__.*?__]%%/g, "")
		.replace(DICE_PATTERNS.GLOBAL_COMMENTS, "")
		.trim();

	// Handle dice message format extraction
	if (DICE_PATTERNS.DETECT_DICE_MESSAGE.test(cleaned)) {
		const simple = cleaned.match(DICE_PATTERNS.DETECT_DICE_MESSAGE);
		if (simple?.[1] && simple?.[3])
			cleaned = cleaned.replace(DICE_PATTERNS.DETECT_DICE_MESSAGE, "$1").trim();
	}

	// Format merged comments based on shared dice notation
	if (merged) {
		if (isShared && !merged.startsWith("#")) merged = `# ${merged}`;
		if (!isShared && merged.startsWith("#")) merged = merged.replace(/^# ?/, "").trim();
	}

	return { cleanedDice: cleaned, mergedComments: merged || undefined };
}
