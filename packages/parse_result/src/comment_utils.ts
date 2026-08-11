import { bareComment, DICE_PATTERNS, matchBareComment } from "@dicelette/utils";
import { extractDiceData } from "./dice_extractor";

export function getComments(content: string, comments?: string) {
	let globalComments = content.match(DICE_PATTERNS.GLOBAL_COMMENTS)?.[1];
	if (!globalComments && !comments) globalComments = bareComment(content);
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

/**
 * Strip a leading `#` comment marker (and one following space) and trim whitespace.
 */
export function stripCommentPrefix(c?: string): string | undefined {
	if (!c) return undefined;
	return c.replace(/^# ?/, "").trim();
}

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
 * => { cleanedDice: "2d6", mergedComments: "# attack damage roll" }
 */
export function extractAndMergeComments(
	dice: string,
	userComments?: string
): { cleanedDice: string; mergedComments?: string } {
	const isShared = dice.includes(";");
	const globalRaw = getComments(dice);
	const diceData = extractDiceData(dice);
	let tailComments = diceData.comments;

	// `tailComments` is a heuristic for messages with no explicit "#" comment
	// (DETECT_DICE_MESSAGE isn't anchored, so it can otherwise land mid-way
	// through a multi-word bracketed comment and capture a fragment that
	// overlaps — but doesn't exactly equal — the real global comment).
	// Once an explicit "#" comment exists, it is authoritative; drop the heuristic.
	if (tailComments && globalRaw) tailComments = undefined;

	const partsRaw = [globalRaw, tailComments, userComments];
	const statsMarkers: string[] = [];
	const commentTexts: string[] = [];

	// Extract stat markers and clean comment text from all sources
	for (const part of partsRaw) {
		if (!part?.trim().length) continue;
		const markers = part.match(/%%\[__.*?__]%%/g) ?? [];
		for (const m of markers) if (!statsMarkers.includes(m)) statsMarkers.push(m);
		const cleanedPart = stripCommentPrefix(part.replace(/%%\[__.*?__]%%/g, "").trim());
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
		// In some cases, empty markers may leave residual "%%%%" that break the dice parser.
		// We remove them cleanly.
		.replace(/%{4,}/g, "")
		// And we normalize occurrences of "%%" isolated surrounded by possible spaces
		.replace(/\s*%%+\s*/g, " ")
		.trim();

	// Handle dice message format extraction
	const simple = matchBareComment(cleaned);
	if (simple?.dice && simple.comment)
		cleaned = (
			cleaned.slice(0, simple.start) +
			simple.dice +
			cleaned.slice(simple.end)
		).trim();

	// Format merged comments based on shared dice notation
	if (merged) {
		if (isShared && !merged.startsWith("#")) merged = `# ${merged}`;
		if (!isShared && merged.startsWith("#")) merged = merged.replace(/^# ?/, "").trim();
	}

	return { cleanedDice: cleaned, mergedComments: merged || undefined };
}
