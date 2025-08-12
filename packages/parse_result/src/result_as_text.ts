import {
	COMMENT_REGEX,
	type Compare,
	type ComparedValue,
	type CustomCritical,
	type Resultat,
} from "@dicelette/core";
import { AND, type CustomCriticalRoll, type Translation } from "@dicelette/types";
import { evaluate } from "mathjs";
import type { Server } from "./interfaces";
import { createUrl, timestamp } from "./utils";
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

	constructor(
		result: Resultat | undefined,
		data: Server,
		critical?: { failure?: number; success?: number; onResult?: boolean },
		charName?: string,
		infoRoll?: { name: string; standardized: string },
		customCritical?: Record<string, CustomCritical>,
		opposition?: ComparedValue
	) {
		this.data = data;
		this.infoRoll = infoRoll;
		this.ul = ln(data.lang);
		this.resultat = result;
		let parser = "";
		if (!result) {
			this.error = true;
			this.output = this.errorMessage();
		} else {
			parser = this.parse(!!infoRoll, critical, customCritical, opposition);
		}
		this.output = this.defaultMessage();
		this.parser = parser;
		this.charName = charName;
	}

	private errorMessage() {
		const { dice } = this.data;
		if (!dice) return this.ul("error.invalidDice.notFound");
		if (dice?.startsWith("-")) return this.ul("error.invalidDice.minus", { dice });
		return this.ul("error.invalidDice.withDice", { dice });
	}

	defaultMessage() {
		return !this.error
			? `${this.infoRollTotal(true)}${this.parser}`
			: this.errorMessage();
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
		return createUrl(this.ul, context, logUrl);
	}

	private message(result: string, tot?: string | number) {
		if (result.includes("◈")) tot = undefined;
		let resultEdited = `${result.replaceAll(";", "\n").replaceAll(":", " ⟶")}`;
		if (!tot) resultEdited = `${resultEdited.replaceAll(/ = (\S+)/g, " = ` $1 `")}`;
		else resultEdited = `${resultEdited.replaceAll(/ = (\S+)/g, `${tot}`)}`;
		resultEdited = resultEdited.replaceAll("*", "\\*");
		return resultEdited;
	}

	private parse(
		interaction?: boolean,
		critical?: { failure?: number; success?: number },
		customCritical?: Record<string, CustomCritical>,
		opposition?: ComparedValue
	) {
		if (!this.resultat) return "";

		const messageResult = this.resultat.result.split(";");
		let msgSuccess: string;
		let criticalState: {
			isCritical?: "failure" | "success" | "custom";
			successOrFailure?: string;
		} = {};

		if (this.resultat.compare) {
			const result = this.compare(messageResult, critical, customCritical, opposition);
			msgSuccess = result.msgSuccess;
			criticalState = result.criticalState;
		} else {
			msgSuccess = this.message(this.resultat.result, " = ` [$1] `");
		}

		const comment = this.comment(interaction);
		const finalRes = this.formatMultipleRes(msgSuccess, criticalState);

		return `${comment} ${finalRes.join("\n  ").trimEnd()}`;
	}

	private compare(
		messageResult: string[],
		critical?: { failure?: number; success?: number },
		customCritical?: Record<string, CustomCritical>,
		opposition?: ComparedValue
	): {
		msgSuccess: string;
		criticalState: {
			isCritical?: "failure" | "success" | "custom";
			successOrFailure?: string;
		};
	} {
		const regexForFormulesDices = /^[✕✓]/;
		let msgSuccess = "";
		let total = 0;
		const natural: number[] = [];
		let isCritical: undefined | "failure" | "success" | "custom";
		let successOrFailure = "";

		for (const r of messageResult) {
			if (r.match(regexForFormulesDices)) {
				msgSuccess += `${this.message(r)}\n`;
				continue;
			}

			const result = this.roll(r, opposition);
			total = result.total;
			successOrFailure = result.successOrFailure;
			const oldCompare = result.oldCompare;

			this.naturalDice(r, natural);

			const criticalResult = this.critical(natural, total, critical, customCritical);
			if (criticalResult) {
				successOrFailure = criticalResult.successOrFailure;
				isCritical = criticalResult.isCritical;
			}

			const messageFormatted = this.display(
				r,
				total,
				oldCompare,
				isCritical,
				opposition,
				successOrFailure,
				customCritical
			);
			msgSuccess += messageFormatted;
			total = 0;
		}

		return { msgSuccess, criticalState: { isCritical, successOrFailure } };
	}

	private roll(r: string, opposition?: ComparedValue) {
		const tot = r.match(/ = (.*)/);
		const total = tot ? Number.parseInt(tot[1], 10) : 0;

		const resultOfCompare = evaluate(
			`${total} ${this.resultat!.compare!.sign} ${this.resultat!.compare!.value}`
		);

		let successOrFailure = resultOfCompare
			? `**${this.ul("roll.success")}**`
			: `**${this.ul("roll.failure")}**`;

		let oldCompare: ComparedValue | undefined;
		if (opposition && resultOfCompare) {
			const newCompare = evaluate(`${total} ${opposition.sign} ${opposition.value}`);
			// Save original comparison for display
			oldCompare = structuredClone(this.resultat!.compare);

			// Mise à jour du message pour montrer le résultat final de l'opposition
			successOrFailure = newCompare
				? `**${this.ul("roll.success")}**`
				: `**${this.ul("roll.failure")}**`;

			// Update current comparison only if opposition is successful
			if (newCompare) {
				this.resultat!.compare = opposition;
			} else {
				// If the opposition fails, the original comparison is retained but the failure is displayed.
				this.resultat!.compare = opposition;
			}
		}

		return { total, successOrFailure, oldCompare };
	}

	private naturalDice(r: string, natural: number[]) {
		const naturalDice = r.matchAll(/\[(\d+)\]/gi);
		for (const dice of naturalDice) {
			natural.push(Number.parseInt(dice[1], 10));
		}
	}

	private critical(
		natural: number[],
		total: number,
		critical?: { failure?: number; success?: number },
		customCritical?: Record<string, CustomCritical>
	):
		| { successOrFailure: string; isCritical: "failure" | "success" | "custom" }
		| undefined {
		if (critical) {
			if (critical.failure && natural.includes(critical.failure)) {
				return {
					successOrFailure: `**${this.ul("roll.critical.failure")}**`,
					isCritical: "failure",
				};
			}
			if (critical.success && natural.includes(critical.success)) {
				return {
					successOrFailure: `**${this.ul("roll.critical.success")}**`,
					isCritical: "success",
				};
			}
		}

		if (customCritical) {
			for (const [name, custom] of Object.entries(customCritical)) {
				const valueToCompare = custom.onNaturalDice ? natural : total;
				let success: unknown;

				if (custom.onNaturalDice) {
					success = natural.includes(Number.parseInt(custom.value));
				} else {
					success = evaluate(`${valueToCompare} ${custom.sign} ${custom.value}`);
				}
				if (success) {
					return {
						successOrFailure: `**${name}**`,
						isCritical: "custom",
					};
				}
			}
		}

		return undefined;
	}

	private display(
		r: string,
		total: number,
		oldCompare: ComparedValue | undefined,
		isCritical: undefined | "failure" | "success" | "custom",
		opposition?: ComparedValue,
		successOrFailure?: string,
		customCritical?: Record<string, CustomCritical>
	): string {
		let testValue = this.resultat!.compare;
		let goodSign = this.goodCompareSign(testValue!, total);

		if (isCritical === "custom" && customCritical) {
			for (const [, custom] of Object.entries(customCritical)) {
				const valueToCompare = custom.onNaturalDice ? [] : total;
				let success: unknown;
				if (custom.onNaturalDice)
					success = true; // If we arrive here, the custom critical has been triggered.
				else success = evaluate(`${valueToCompare} ${custom.sign} ${custom.value}`);

				if (success) {
					testValue = this.convertCustomCriticalToCompare(custom);
					goodSign = this.goodCompareSign(testValue, total);
					break;
				}
			}
		}

		let oldCompareStr = "";
		// Do not display opposition comparisons for critical failures
		// A critical failure short-circuits any logic of comparison
		let first = this.ul("roll.opposition");
		if (isCritical !== "failure") {
			if (isCritical === "custom" && opposition) {
				first = successOrFailure
					? this.ul("roll.cc", {
							custom: successOrFailure.toLowerCase().replaceAll("**", ""),
						})
					: "other";
				oldCompareStr += this.chained(total, opposition, "opposition");
			}
			if (oldCompare) oldCompareStr += this.chained(total, oldCompare, "base");
		}
		const text = opposition && oldCompareStr.length > 0 ? first : "";

		const totalSuccess = testValue
			? ` = \`[${total}] ${goodSign} ${this.formatCompare(testValue, "`")}${text}${oldCompareStr}`
			: `= \`[${total}]\``;

		const resMsg = this.message(r, totalSuccess);
		if (resMsg.match(/^[✕✓※]/)) {
			return `${this.message(r, totalSuccess).replace(/^[✕✓※]/, `${successOrFailure} — `)}\n`;
		}
		return `${successOrFailure} — ${resMsg}\n`;
	}

	private comment(interaction?: boolean): string {
		const extractRegex = /%%(.*)%%/;
		const extractorInfo = extractRegex.exec(this.resultat!.comment || "");
		let info = "";

		if (extractorInfo?.[1]) {
			info = `${extractorInfo[1]} `;
			this.resultat!.comment = this.resultat!.comment?.replace(extractRegex, "").trim();
		}
		return this.resultat!.comment
			? `${info}*${this.resultat!.comment.replaceAll(/(\\\*|#|\*\/|\/\*)/g, "")
					.replaceAll("×", "*")
					.trim()}*\n `
			: interaction
				? `${info}\n `
				: `${info ? `${info}\n` : ""}_ _`;
	}

	private formatMultipleRes(
		msgSuccess: string,
		criticalState: {
			isCritical?: "failure" | "success" | "custom";
			successOrFailure?: string;
		}
	): string[] {
		const dicesResult = /(?<entry>\S+) ⟶ (?<calc>.*) =/;
		const splitted = msgSuccess.split("\n");
		const finalRes = [];

		for (let res of splitted) {
			const matches = dicesResult.exec(res);
			if (matches) {
				const { entry, calc } = matches.groups || {};
				if (entry) {
					const entryStr = entry.replaceAll("\\*", "×");
					res = res.replace(entry, `\`${entryStr.trim()}\``);
				}
				if (calc) {
					const calcStr = calc.replaceAll("\\*", "×");
					res = res.replace(calc, `\`${calcStr.trim()}\``);
				}
			}

			res = this.formatCriticalSymbols(
				res,
				criticalState.isCritical,
				criticalState.successOrFailure
			);
			finalRes.push(res.trimStart());
		}
		return finalRes;
	}

	private formatCriticalSymbols(
		res: string,
		isCritical: undefined | "failure" | "success" | "custom",
		successOrFailure?: string
	): string {
		const regexForFormulesDices = /^[✕✓]/;

		if (isCritical === "failure") {
			return res.replace("✕", `**${this.ul("roll.critical.failure")}** —`);
		}
		if (isCritical === "success") {
			return res.replace("✓", `**${this.ul("roll.critical.success")}** —`);
		}
		if (isCritical === "custom") {
			return res.replace(regexForFormulesDices, `${successOrFailure} —`);
		}
		return res
			.replace("✕", `**${this.ul("roll.failure")}** —`)
			.replace("✓", `**${this.ul("roll.success")}** —`);
	}

	private chained(
		total: number,
		oldCompare: ComparedValue,
		is: "opposition" | "base" | "other" = "other"
	): string {
		const goodSignOld = this.goodCompareSign(oldCompare, total);
		const text = this.ul(`roll.${is}`);
		return ` ${AND} \`${goodSignOld} ${this.formatCompare(oldCompare, "`")}${text}`;
	}

	private formatCompare(compare?: ComparedValue, lastChar?: string) {
		const char = lastChar ? lastChar : "";
		if (compare?.rollValue && !compare.originalDice)
			return `${compare.rollValue} ═ ${compare.value}${char}`;
		if (compare?.rollValue) return `${compare.rollValue.replaceAll("=", "═")}${char}`;
		if (compare?.value) return `${compare.value}${char}`;
		return `${this.resultat?.compare?.value}${char}`;
	}

	private goodCompareSign(
		compare: Compare,
		total: number
	): "<" | ">" | "⩾" | "⩽" | "=" | "!=" | "==" | "" {
		const { sign, value } = compare;
		const success = evaluate(`${total} ${sign} ${value}`);
		if (success) {
			return sign.replace(">=", "⩾").replace("<=", "⩽") as
				| "<"
				| ">"
				| "⩾"
				| "⩽"
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
				return "⩽";
			case "<=":
				return "⩾";
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
			? `${this.resultat.compare.sign} ${this.formatCompare()}`
			: "";
		let mention = authorId ? `*<@${authorId}>* ` : "";
		if (this.charName)
			mention = `**__${this.charName.capitalize()}__** ${mention.length > 0 ? `(${mention})` : ""}`;
		const authorMention = `${mention}(🎲 \`${this.resultat?.dice.replace(COMMENT_REGEX, "").trim()}${signMessage ? ` ${signMessage}` : ""}\`)`;
		return `${authorMention}${timestamp(this.data.config?.timestamp)}\n${this.parser}${linkToOriginal}`;
	}

	private convertCustomCriticalToCompare(custom: CustomCriticalRoll): ComparedValue {
		const compare: ComparedValue = {
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
