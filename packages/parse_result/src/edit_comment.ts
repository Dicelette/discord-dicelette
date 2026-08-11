import { PARSE_RESULT_PATTERNS } from "@dicelette/utils";
import { stripCommentPrefix } from "./comment_utils";

/**
 * Rebuilds a rendered roll-result message (as produced by `ResultAsText.onMessageSend`)
 * with its comment replaced by `newComment`, inserting one if the roll had none.
 *
 * @param content - The full text of the bot's roll-result message
 * @param newComment - The replacement comment, taken verbatim from the user's reply
 * @returns The rebuilt message content, or `undefined` if `content` doesn't look like a
 * roll-result message, or `newComment` is empty once sanitized
 */
export function replaceRollComment(
	content: string,
	newComment: string
): string | undefined {
	const sanitized = sanitizeComment(newComment);
	if (!sanitized) return undefined;

	const lines = content.split("\n");
	if (lines.length < 2) return undefined;

	const secondLine = lines[1];
	const looksLikeDice =
		secondLine.startsWith("_ _") ||
		PARSE_RESULT_PATTERNS.diceResultPattern.test(secondLine) ||
		PARSE_RESULT_PATTERNS.allSharedSymbols.test(secondLine);

	if (looksLikeDice) {
		lines.splice(1, 0, ` *${sanitized}*`);
	} else {
		// Always matches (the trailing group is optional), so `prefix` is always defined.
		const { prefix, comment } = PARSE_RESULT_PATTERNS.trailingComment.exec(secondLine)!
			.groups as { prefix: string; comment?: string };
		lines[1] =
			comment !== undefined ? `${prefix}*${sanitized}*` : `${prefix} *${sanitized}*`;
	}
	return lines.join("\n");
}

function sanitizeComment(raw: string): string {
	const collapsed = raw.replace(/\r?\n+/g, " ").trim();
	const withoutHash = stripCommentPrefix(collapsed) ?? "";
	return withoutHash.replace(/\*/g, "\\*").trim();
}
