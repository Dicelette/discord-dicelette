import {
	bareComment,
	DICE_PATTERNS,
	maskBracketComments,
	matchBareComment,
} from "@dicelette/utils";
import { extractDiceData } from "./dice_extractor";

/** `#`, `//` and `/*` only: unlike `[`, they have no closing marker and end the whole dice. */
const GLOBAL_COMMENT_MARKER = /\s(#|\/{2}|\/\*)(?<comment>.*)/i;

/** Like the core's `splitDiceComment`, minus its `[` marker: in a shared roll a bracketed comment belongs to
 * its own `;` segment and must stay in the dice for the engine to render it. */
export function splitGlobalComment(dice: string): {
	dice: string;
	comment: string | undefined;
} {
	const match = GLOBAL_COMMENT_MARKER.exec(maskBracketComments(dice));
	if (!match?.groups) return { dice: dice.trimEnd(), comment: undefined };
	const comment = dice
		.slice(match.index + match[0].length - match.groups.comment.length)
		.trim();
	return { dice: dice.slice(0, match.index).trimEnd(), comment: comment || undefined };
}

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

/** Strips a leading `#` comment marker (and one following space) and trims whitespace. */
export function stripCommentPrefix(c?: string): string | undefined {
	if (!c) return undefined;
	return c.replace(/^# ?/, "").trim();
}

/** Merges comments from the dice formula and user input, handling stat markers (%%[__stat__]%%), deduplication,
 * and shared-vs-single dice formatting. */
export function extractAndMergeComments(
	dice: string,
	userComments?: string
): { cleanedDice: string; mergedComments?: string } {
	const isShared = dice.includes(";");
	const globalRaw = getComments(dice);
	const diceData = extractDiceData(dice);
	let tailComments = diceData.comments;

	// tailComments is a heuristic for messages with no explicit "#" comment (DETECT_DICE_MESSAGE isn't anchored,
	// so it can capture a fragment overlapping the real comment); once a "#" comment exists, it wins.
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
		// Cleans up residual "%%%%" left by empty markers, which would otherwise break the dice parser.
		.replace(/%{4,}/g, "")
		// Normalizes stray "%%" left surrounded by spaces.
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
