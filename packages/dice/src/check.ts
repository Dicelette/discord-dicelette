import { type Resultat, roll } from "@dicelette/core";
import { DETECT_DICE_MESSAGE } from "./interfaces";

export function isRolling(content: string) {
	const detectRoll = content.match(/\[(.*)\]/)?.[1];
	const comments = content.match(DETECT_DICE_MESSAGE)?.[3].replaceAll("*", "\\*");
	if (comments && !detectRoll) {
		const diceValue = content.match(/^\S*#?d\S+|\{.*\}/i);
		if (!diceValue) return;
		content = content.replace(DETECT_DICE_MESSAGE, "$1");
	}
	const deleteInput = true;
	let result: Resultat | undefined;
	try {
		result = detectRoll ? roll(detectRoll.toLowerCase()) : roll(content.toLowerCase());
	} catch (e) {
		return undefined;
	}
	if (comments && !detectRoll && result) {
		result.dice = `${result.dice} /* ${comments} */`;
		result.comment = comments;
	}
	return { result, detectRoll };
}
