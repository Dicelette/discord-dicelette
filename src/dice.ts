/* eslint-disable no-useless-escape */
import {Compare, Resultat } from "@dicelette/core";
import { Translation } from "@interface";
import { evaluate } from "mathjs";
import {dedent} from "ts-dedent";

/**
 * Parse the result of the dice to be readable
 * @param {Resultat} output
 * @param {Translation} ul 
 * @param {failure: number | undefined, success: number | undefined} critical 
 */
export function parseResult(output: Resultat, ul: Translation, critical?: {failure?: number, success?: number}) {
	//result is in the form of "d% //comment: [dice] = result"
	//parse into
	let msgSuccess = `${output.result.replaceAll(";", "\n").replaceAll(":", " ⟶").replaceAll(/ = (\d+)/g, " = ` $1 `").replaceAll("*", "\\*")}`;
	const messageResult = output.result.split(";");
	let succ = "";
	if (output.compare) {
		msgSuccess = "";
		let total = 0;
		const natural: number[] = [];
		for (const r of messageResult) {
			const tot = r.match(/ = (\d+)/);
			if (tot) {
				total = parseInt(tot[1], 10);
			}
			
			succ = evaluate(`${total} ${output.compare.sign} ${output.compare.value}`) ? `**${ul("roll.success")}**` : `**${ul("roll.failure")}**`;
			const naturalDice = r.matchAll(/\[(\d+)\]/gi);
			for (const dice of naturalDice) {
				natural.push(parseInt(dice[1], 10));
			}
			if (critical) {
				if (critical.failure && natural.includes(critical.failure)) {
					succ = `**${ul("roll.critical.failure")}**`;
				} else if (critical.success && natural.includes(critical.success)) {
					succ = `**${ul("roll.critical.success")}**`;
				}
			}
			const totSucc = output.compare ? ` = \`${total} ${goodCompareSign(output.compare, total)} [${output.compare.value}]\`` : `= \`${total}\``;
			msgSuccess += `\n${succ} — ${r.replaceAll(":", " ⟶").replaceAll(/ = (\S+)/g, totSucc).replaceAll("*", "\\*")}`;
			total = 0;
		}
	} else {
		msgSuccess = `${output.result.replaceAll(";","\n").replaceAll(":", " ⟶").replaceAll(/ = (\S+)/g, " = ` $1 `").replaceAll("*", "\\*")}`;
	}
	const result = msgSuccess;
	const comment = output.comment ? `*${output.comment.replaceAll(/(\\\*|#|\*\/|\/\*)/g, "").trim()}*\n` : "";
	return dedent(`${comment}${result}`);
}

/**
 * Replace the compare sign as it will invert the result for a better reading
 * As the comparaison is after the total (like 20>10)
 * @param {Compare} compare 
 * @param {number} total
 */
function goodCompareSign(compare: Compare, total: number): "<" | ">" | "≥" | "≤" | "=" | "!=" | "==" | "" {
	//as the comparaison value is AFTER the total, we need to invert the sign to have a good comparaison string
	const {sign, value} = compare;
	const success = eval(`${total} ${sign} ${value}`);
	if (success) {
		return sign.replace(">=", "≥").replace("<=", "≤") as "<" | ">" | "≥" | "≤" | "=" | "" | "!=" | "==";
	}
	switch (sign) {
	case "<":
		return ">";
	case ">":
		return "<";
	case ">=":
		return "≤";
	case "<=":
		return "≥";
	case "=":
		return "=";
	case "!=":
		return "!=";
	case "==":
		return "==";
	default:
		return "";
	}
}

