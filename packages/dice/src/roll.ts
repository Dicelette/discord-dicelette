import {
	COMMENT_REGEX,
	type Compare,
	type CustomCritical,
	type Resultat,
	roll,
} from "@dicelette/core";
import type { Translation } from "@dicelette/types";
import { evaluate } from "mathjs";
import { DETECT_DICE_MESSAGE, type RollResult, type Server } from "./interfaces";
import { timestamp } from "./utils.js";
import "uniformize";
import { ln } from "@dicelette/localization";
/**
 * create the roll dice, parse interaction etc... When the slash-commands is used for dice
 */
export function rollText(
	result: Resultat | undefined,
	data: Server,
	critical?: { failure?: number; success?: number },
	charName?: string,
	infoRoll?: { name: string; standardized: string },
	edit?: boolean,
	context?: { guildId: string; channelId: string; messageId: string },
	logUrl?: string
): RollResult {
	const ul = ln(data.lang);
	if (!result) {
		return { error: true, result: ul("roll.error") };
	}
	const parser = parseResult(result, ul, critical, !!infoRoll);
	let mentionUser = `<@${data.userId}>`;
	const titleCharName = `__**${charName?.capitalize()}**__`;
	mentionUser = charName ? `${titleCharName} (${mentionUser})` : mentionUser;
	const infoRollTotal = (mention?: boolean, time?: boolean) => {
		let user = " ";
		if (mention) user = mentionUser;
		else if (charName) user = titleCharName;
		if (time) user += `${timestamp(data.config?.timestamp)}`;
		if (user.trim().length > 0) user += `${ul("common.space")}:\n`;
		if (infoRoll) return `${user}[__${infoRoll.name.capitalize()}__] `;
		return user;
	};
	const retrieveUser = infoRollTotal(true);
	if (edit) return { result: `${infoRollTotal(true, true)}${parser}` };
	if (logUrl)
		return {
			result: `${infoRollTotal(true, true)}${parser}${createUrl(ul, undefined, logUrl)}`,
		};
	if (context) return { result: `${retrieveUser}${parser}${createUrl(ul, context)}` };
	return { result: `${retrieveUser}${parser}` };
}

export function getRoll(ul: Translation, dice: string): Resultat | undefined {
	const comments = dice.match(DETECT_DICE_MESSAGE)?.[3].replaceAll("*", "\\*");
	if (comments) {
		dice = dice.replace(DETECT_DICE_MESSAGE, "$1");
	}
	dice = dice.trim();
	const rollDice = roll(dice.trim().toLowerCase());
	if (!rollDice) {
		return undefined;
	}
	if (comments) {
		rollDice.comment = comments;
		rollDice.dice = `${dice} /* ${comments} */`;
	}
	return rollDice;
}

export function createUrl(
	ul: Translation,
	context?: { guildId: string; channelId: string; messageId: string },
	logUrl?: string
) {
	if (logUrl) return `\n-# ↪ ${logUrl}`;
	if (!context) return "";
	const { guildId, channelId, messageId } = context;
	return `\n\n-# ↪ [${ul("common.context")}](<https://discord.com/channels/${guildId}/${channelId}/${messageId}>)`;
}

export function rollContent(
	result: Resultat,
	parser: string,
	linkToOriginal: string,
	authorId?: string,
	time?: boolean,
	reply?: boolean
) {
	if (reply) return `${parser}${linkToOriginal}`;
	const signMessage = result.compare
		? `${result.compare.sign} ${result.compare.value}`
		: "";
	const authorMention = `*<@${authorId}>* (🎲 \`${result.dice.replace(COMMENT_REGEX, "")}${signMessage ? ` ${signMessage}` : ""}\`)`;
	return `${authorMention}${timestamp(time)}\n${parser}${linkToOriginal}`;
}
/**
 * Parse the result of the dice to be readable
 */
export function parseResult(
	output: Resultat,
	ul: Translation,
	critical?: { failure?: number; success?: number },
	interaction?: boolean,
	customCritical?: { [name: string]: CustomCritical }
) {
	//result is in the form of "d% //comment: [dice] = result"
	//parse into
	const regexForFormulesDices = /^[✕◈✓]/;
	let msgSuccess: string;
	const messageResult = output.result.split(";");
	let successOrFailure = "";
	let isCritical: undefined | "failure" | "success" | "custom" = undefined;
	if (output.compare) {
		msgSuccess = "";
		let total = 0;
		const natural: number[] = [];
		for (const r of messageResult) {
			if (r.match(regexForFormulesDices)) {
				msgSuccess += `${r
					.replaceAll(";", "\n")
					.replaceAll(":", " ⟶")
					.replaceAll(/ = (\S+)/g, " = ` $1 `")
					.replaceAll("*", "\\*")}\n`;
				continue;
			}
			const tot = r.match(/ = (\d+)/);
			if (tot) {
				total = Number.parseInt(tot[1], 10);
			}

			successOrFailure = evaluate(
				`${total} ${output.compare.sign} ${output.compare.value}`
			)
				? `**${ul("roll.success")}**`
				: `**${ul("roll.failure")}**`;
			// noinspection RegExpRedundantEscape
			const naturalDice = r.matchAll(/\[(\d+)\]/gi);
			for (const dice of naturalDice) {
				natural.push(Number.parseInt(dice[1], 10));
			}
			if (critical) {
				if (critical.failure && natural.includes(critical.failure)) {
					successOrFailure = `**${ul("roll.critical.failure")}**`;
					isCritical = "failure";
				} else if (critical.success && natural.includes(critical.success)) {
					successOrFailure = `**${ul("roll.critical.success")}**`;
					isCritical = "success";
				}
			}
			if (customCritical) {
				for (const [name, custom] of Object.entries(customCritical)) {
					const valueToCompare = custom.onNaturalDice ? natural : total;
					const success = evaluate(`${valueToCompare} ${custom.sign} ${custom.value}`);
					if (success) {
						successOrFailure = `**${name}**`;
						isCritical = "custom";
						break;
					}
				}
			}
			const totalSuccess = output.compare
				? ` = \`${total} ${goodCompareSign(output.compare, total)} [${output.compare.value}]\``
				: `= \`${total}\``;
			msgSuccess += `${successOrFailure} — ${r
				.replaceAll(":", " ⟶")
				.replaceAll(/ = (\S+)/g, totalSuccess)
				.replaceAll("*", "\\*")}\n`;
			total = 0;
		}
	} else
		msgSuccess = `${output.result
			.replaceAll(";", "\n")
			.replaceAll(":", " ⟶")
			.replaceAll(/ = (\S+)/g, " = ` $1 `")
			.replaceAll("*", "\\*")}`;
	const comment = output.comment
		? `*${output.comment
				.replaceAll(/(\\\*|#|\*\/|\/\*)/g, "")
				.replaceAll("×", "*")
				.trim()}*\n`
		: interaction
			? "\n"
			: "";
	const dicesResult = /(?<entry>\S+) ⟶ (?<calc>.*) =/;
	const splitted = msgSuccess.split("\n");
	const finalRes = [];
	for (let res of splitted) {
		const matches = dicesResult.exec(res);
		if (matches) {
			const { entry, calc } = matches.groups || {};
			if (entry) {
				const entryStr = entry.replaceAll("\\*", "×");
				res = res.replace(entry, `\`${entryStr}\``);
			}
			if (calc) {
				const calcStr = calc.replaceAll("\\*", "×");
				res = res.replace(calc, `\`${calcStr}\``);
			}
		}
		if (isCritical === "failure") {
			res = res.replace(regexForFormulesDices, `**${ul("roll.critical.failure")}** —`);
		} else if (isCritical === "success") {
			res = res.replace(regexForFormulesDices, `**${ul("roll.critical.success")}** —`);
		} else if (isCritical === "custom") {
			res = res.replace(regexForFormulesDices, `${successOrFailure} —`);
		} else {
			res = res
				.replace("✕", `**${ul("roll.failure")}** —`)
				.replace("✓", `**${ul("roll.success")}** —`);
		}

		finalRes.push(res.trimStart());
	}
	return `${comment}  ${finalRes.join("\n  ").trimEnd()}`;
}

/**
 * Replace the compare sign as it will invert the result for a better reading
 * As the comparaison is after the total (like 20>10)
 * @param {Compare} compare
 * @param {number} total
 */
function goodCompareSign(
	compare: Compare,
	total: number
): "<" | ">" | "≥" | "≤" | "=" | "!=" | "==" | "" {
	//as the comparaison value is AFTER the total, we need to invert the sign to have a good comparaison string
	const { sign, value } = compare;
	const success = evaluate(`${total} ${sign} ${value}`);
	if (success) {
		return sign.replace(">=", "≥").replace("<=", "≤") as
			| "<"
			| ">"
			| "≥"
			| "≤"
			| "="
			| ""
			| "!="
			| "==";
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

/**
 * A function that turn `(N) Name SIGN VALUE` into the custom critical object as `{[name]: CustomCritical}`
 */
export function parseCustomCritical(
	name: string,
	customCritical: string
): { [name: string]: CustomCritical } | undefined {
	const findPart = /(?<sign>([<>=!]+))(?<value>.*)/gi;
	const match = findPart.exec(customCritical);
	if (!match) return;
	const { sign, value } = match.groups || {};
	if (!name || !sign || !value) return;
	const onNaturalDice = name.startsWith("(N)");
	const nameStr = onNaturalDice ? name.replace("(N)", "") : name;
	return {
		[nameStr.trimAll()]: {
			sign: sign.trimAll() as "<" | ">" | "<=" | ">=" | "=" | "!=" | "==",
			value: value.trimAll(),
			onNaturalDice,
		},
	};
}

export function convertCustomCriticalValue(
	custom: { [name: string]: CustomCritical },
	stats: number
) {
	const customCritical: { [name: string]: CustomCritical } = {};
	for (const [name, value] of Object.entries(custom)) {
		const newValue = value.value.replace("$", stats.toString());
		customCritical[name] = {
			onNaturalDice: value.onNaturalDice,
			sign: value.sign,
			value: newValue,
		};
	}
	return customCritical;
}
