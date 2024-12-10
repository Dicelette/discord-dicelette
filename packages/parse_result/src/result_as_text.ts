import {
	COMMENT_REGEX,
	type Compare,
	type CustomCritical,
	type Resultat,
} from "@dicelette/core";
import type { CustomCriticalRoll, Translation } from "@dicelette/types";
import { evaluate } from "mathjs";
import type { Server } from "./interfaces";
import { timestamp } from "./utils.js";
import "uniformize";
import { ln } from "@dicelette/localization";

export class ResultAsText {
	parser?: string;
	error?: boolean;
	output: string;
	private readonly data: Server;
	private readonly ul: Translation;
	private readonly charName?: string;
	private readonly infoRoll?: { name: string; standardized: string };
	private readonly resultat?: Resultat;
	private readonly modificator?: string | number = 0;
	constructor(
		result: Resultat | undefined,
		data: Server,
		critical?: { failure?: number; success?: number },
		charName?: string,
		infoRoll?: { name: string; standardized: string },
		customCritical?: Record<string, CustomCritical>,
		modificator?: string | number
	) {
		this.data = data;
		this.infoRoll = infoRoll;
		this.ul = ln(data.lang);
		this.resultat = result;
		let parser = "";
		this.modificator = modificator ?? 0;
		if (!result) {
			this.error = true;
			this.output = this.ul("roll.error");
		} else {
			parser = this.parseResult(!!infoRoll, critical, customCritical);
		}
		this.output = this.defaultMessage();
		this.parser = parser;
		this.charName = charName;
	}

	defaultMessage() {
		return !this.error
			? `${this.infoRollTotal(true)}${this.parser}`
			: this.ul("roll.error");
	}

	private infoRollTotal(mention?: boolean, time?: boolean) {
		let mentionUser = `<@${this.data.userId}>`;
		const titleCharName = `__**${this.charName?.capitalize()}**__`;
		mentionUser = this.charName ? `${titleCharName} (${mentionUser})` : mentionUser;
		let user = " ";
		if (mention) user = mentionUser;
		else if (this.charName) user = titleCharName;
		if (time) user += `${timestamp(this.data?.config?.timestamp)}`;
		if (user.trim().length > 0) user += `${this.ul("common.space")}:\n`;
		if (this.infoRoll) return `${user}[__${this.infoRoll.name.capitalize()}__] `;
		return user;
	}
	edit() {
		return { result: `${this.infoRollTotal(true, true)}${this.parser}` };
	}
	logUrl(url?: string) {
		return {
			result: `${this.infoRollTotal(true, true)}${this.parser}${this.createUrl(undefined, url)}`,
		};
	}
	context(context: { guildId: string; channelId: string; messageId: string }) {
		return {
			result: `${this.infoRollTotal(true, true)}${this.parser}${this.createUrl(context)}`,
		};
	}

	createUrl(
		context?: { guildId: string; channelId: string; messageId: string },
		logUrl?: string
	) {
		if (logUrl) return `\n\n-# ↪ ${logUrl}`;
		if (!context) return "";
		const { guildId, channelId, messageId } = context;
		return `\n\n-# ↪ [${this.ul("common.context")}](<https://discord.com/channels/${guildId}/${channelId}/${messageId}>)`;
	}

	private messageResult(result: string, tot?: string | number) {
		let resultEdited = `${result.replaceAll(";", "\n").replaceAll(":", " ⟶")}`;
		if (!tot) resultEdited = `${resultEdited.replaceAll(/ = (\S+)/g, " = ` $1 `")}`;
		else resultEdited = `${resultEdited.replaceAll(/ = (\S+)/g, `${tot}`)}`;
		resultEdited = resultEdited.replaceAll("*", "\\*");
		return resultEdited;
	}

	private parseResult(
		interaction?: boolean,
		critical?: { failure?: number; success?: number },
		customCritical?: Record<string, CustomCritical>
	) {
		if (!this.resultat) return "";
		const regexForFormulesDices = /^[✕◈✓]/;
		let msgSuccess: string;
		const messageResult = this.resultat.result.split(";");
		let successOrFailure = "";
		let isCritical: undefined | "failure" | "success" | "custom" = undefined;
		if (this.resultat.compare) {
			msgSuccess = "";
			let total = 0;
			const natural: number[] = [];
			for (const r of messageResult) {
				if (r.match(regexForFormulesDices)) {
					msgSuccess += `${this.messageResult(r)}\n`;
					continue;
				}
				const tot = r.match(/ = (\d+)/);
				if (tot) {
					total = Number.parseInt(tot[1], 10);
				}

				successOrFailure = evaluate(
					`${total} ${this.resultat.compare.sign} ${this.resultat.compare.value}`
				)
					? `**${this.ul("roll.success")}**`
					: `**${this.ul("roll.failure")}**`;
				// noinspection RegExpRedundantEscape
				const naturalDice = r.matchAll(/\[(\d+)\]/gi);
				for (const dice of naturalDice) {
					natural.push(Number.parseInt(dice[1], 10));
				}
				if (critical) {
					if (critical.failure && natural.includes(critical.failure)) {
						successOrFailure = `**${this.ul("roll.critical.failure")}**`;
						isCritical = "failure";
					} else if (critical.success && natural.includes(critical.success)) {
						successOrFailure = `**${this.ul("roll.critical.success")}**`;
						isCritical = "success";
					}
				}
				let testValue = this.resultat.compare;
				let goodSign = this.goodCompareSign(testValue, total);
				if (customCritical) {
					for (const [name, custom] of Object.entries(customCritical)) {
						const valueToCompare = custom.onNaturalDice ? natural : total;
						let success: unknown;
						if (custom.onNaturalDice)
							success = natural.includes(Number.parseInt(custom.value));
						else success = evaluate(`${valueToCompare} ${custom.sign} ${custom.value}`);
						if (success) {
							successOrFailure = `**${name}**`;
							isCritical = "custom";
							testValue = this.convertCustomCriticalToCompare(custom);
							goodSign = this.goodCompareSign(testValue, total);
							break;
						}
					}
				}
				const totalSuccess = testValue
					? ` = \`[${total}] ${goodSign} ${this.compareValue(testValue, "`")}`
					: `= \`[${total}]\``;
				msgSuccess += `${successOrFailure} — ${this.messageResult(r, totalSuccess)}\n`;
				total = 0;
			}
		} else msgSuccess = `${this.messageResult(this.resultat.result, " = ` [$1] `")}`;
		const comment = this.resultat.comment
			? `*${this.resultat.comment
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
				res = res.replace(
					regexForFormulesDices,
					`**${this.ul("roll.critical.failure")}** —`
				);
			} else if (isCritical === "success") {
				res = res.replace(
					regexForFormulesDices,
					`**${this.ul("roll.critical.success")}** —`
				);
			} else if (isCritical === "custom") {
				res = res.replace(regexForFormulesDices, `${successOrFailure} —`);
			} else {
				res = res
					.replace("✕", `**${this.ul("roll.failure")}** —`)
					.replace("✓", `**${this.ul("roll.success")}** —`);
			}

			finalRes.push(res.trimStart());
		}
		return `${comment}  ${finalRes.join("\n  ").trimEnd()}`;
	}

	private compareValue(compare?: Compare, lastChar?: string) {
		const char = lastChar ? lastChar : "";
		console.log(compare);
		if (compare?.rollValue) return `${char}${compare.rollValue}`;
		if (compare?.value) return `${compare.value}${char}`;
		return `${this.resultat?.compare?.value}${char}`;
	}

	/**
	 * Replace the compare sign as it will invert the result for a better reading
	 * As the comparaison is after the total (like 20>10)
	 * @param {Compare} compare
	 * @param {number} total
	 */
	private goodCompareSign(
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

	onMessageSend(
		context?: { guildId: string; channelId: string; messageId: string } | string,
		authorId?: string
	) {
		let linkToOriginal = "";
		if (typeof context === "object") {
			linkToOriginal = this.createUrl({
				guildId: context.guildId,
				channelId: context.channelId,
				messageId: context.messageId,
			});
		} else if (context) {
			linkToOriginal = this.createUrl(undefined, context);
		}
		const signMessage = this.resultat?.compare
			? `${this.resultat.compare.sign} ${this.compareValue()}`
			: "";
		const mention = authorId ? `*<@${authorId}>* ` : "";
		const authorMention = `${mention}(🎲 \`${this.resultat?.dice.replace(COMMENT_REGEX, "")}${signMessage ? ` ${signMessage}` : ""}\`)`;
		return `${authorMention}${timestamp(this.data.config?.timestamp)}\n${this.parser}${linkToOriginal}`;
	}

	private convertCustomCriticalToCompare(custom: CustomCriticalRoll) {
		const compare: Compare = {
			sign: custom.sign,
			value: Number.parseInt(custom.value, 10),
		};
		if (custom.dice) {
			compare.originalDice = custom.dice.originalDice;
			compare.rollValue = custom.dice.rollValue;
		}
		return compare;
	}
}
