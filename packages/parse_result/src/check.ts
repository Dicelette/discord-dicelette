import { type Resultat, roll } from "@dicelette/core";
import { DETECT_DICE_MESSAGE } from "./interfaces.js";
import { trimAll } from "./utils";
import { logger } from "@dicelette/utils";

export function isRolling(content: string) {
	const detectRoll = content.match(/\[.*\]/)?.[1];
	let comments = content.match(DETECT_DICE_MESSAGE)?.[3].replaceAll("*", "\\*");
	if (comments && !detectRoll) {
		const diceValue = content.match(/^\S*#?d\S+|\{.*\}/i);
		if (!diceValue) return;
		const chained = chainedComments(content, comments);
		content = chained.content;
		comments = chained.comments;
	}
	let result: Resultat | undefined;
	try {
		result = detectRoll ? roll(trimAll(detectRoll)) : roll(trimAll(content));
	} catch (e) {
		logger.warn(e);
		return undefined;
	}
	if (comments && !detectRoll && result) {
		result.dice = `${result.dice} /* ${comments} */`;
		result.comment = comments;
	}
	if (!result && !detectRoll) return undefined;
	return { result, detectRoll };
}

function chainedComments(content: string, comments: string) {
	if (comments.match(/\[(.*)]/) && content.includes("&") && content.includes(";")) {
		content = content.match(/^\[(.*)\]$/)
			? content.replace(/\[(.*)\]/, "$1").trim()
			: content;
		//we must search for the global comments, that will start as `# comments`
		const globalComments = content.match(/# ?(.*)/)?.[1];
		//remove from the content the comments
		if (globalComments) {
			content = content.replace(/# ?(.*)/, "").trim();
			return { content, comments: globalComments };
		}
		return {
			content,
			comments: undefined,
		};
	}
	return {
		content: content.replace(DETECT_DICE_MESSAGE, "$1"),
		comments: content.match(/# ?(.*)/)?.[1] ?? comments,
	};
}
