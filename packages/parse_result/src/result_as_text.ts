import {
	type Compare,
	type ComparedValue,
	type CustomCritical,
	DiceTypeError,
	isNumber,
	type Resultat,
} from "@dicelette/core";
import {
	AND,
	type CustomCriticalRoll,
	IGNORE_COUNT_KEY,
	type Translation,
} from "@dicelette/types";
import { evaluate } from "mathjs";
import type { AsciiSign, Server } from "./interfaces";
import { asciiSign, createUrl, goodSign, timestamp } from "./utils";
import "uniformize";
import { ln } from "@dicelette/localization";
import { logger, PARSE_RESULT_PATTERNS } from "@dicelette/utils";

function isResolvedComparator(rollValue?: string, originalDice?: string): boolean {
	if (originalDice || rollValue === undefined) return true;
	if (isNumber(rollValue)) return true;
	try {
		return typeof evaluate(rollValue) === "number";
	} catch {
		return false;
	}
}

export class ResultAsText {
	parser?: string;
	error?: boolean;
	output: string;
	private readonly data: Server;
	readonly ul: Translation;
	private readonly charName?: string;
	private readonly infoRoll?: { name: string; standardized: string };
	readonly resultat?: Resultat;
	private headerCompare?: ComparedValue;
	private readonly statsPerSegment?: string[];
	private readonly commentsPerSegment?: string[];
	private readonly hiddenSegments: number;

	private ignoreCount = "";

	constructor(
		result: Resultat | undefined,
		data: Server,
		critical?: { failure?: number; success?: number; onResult?: boolean },
		charName?: string,
		infoRoll?: { name: string; standardized: string },
		customCritical?: Record<string, CustomCritical>,
		opposition?: ComparedValue,
		statsPerSegment?: string[]
	) {
		this.data = data;
		this.infoRoll = infoRoll;
		this.ul = ln(data.lang);
		this.resultat = result;
		this.ignoreCount = this.setIgnoreCount();
		this.statsPerSegment = statsPerSegment?.some((s) => s?.trim().length)
			? statsPerSegment
			: undefined;
		this.commentsPerSegment = this.extractCommentsPerSegment();
		this.hiddenSegments = this.countHiddenSegments();
		let parser = "";
		if (!result) {
			this.error = true;
			this.output = this.errorMessage();
		} else parser = this.parse(!!infoRoll, critical, customCritical, opposition);
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
		let compareHint = "";
		const header = this.headerCompare ?? this.resultat?.compare;
		const isSharedRoll = PARSE_RESULT_PATTERNS.allSharedSymbols.test(
			this.resultat?.result || ""
		);
		if (header && !isSharedRoll)
			compareHint = ` (\`${header.sign} ${this.formatCompare(header)}\`)`;

		if (user.trim().length > 0) user += `${this.ul("common.space")}${compareHint}:\n`;
		if (this.infoRoll && (!this.statsPerSegment || this.statsPerSegment.length === 0))
			return `${user}[__${this.infoRoll.name.capitalize()}__]\n`;
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
	private parseParenthesis(resultEdited: string) {
		const arrowPos = resultEdited.indexOf(" ⟶");
		if (arrowPos === -1) return resultEdited;
		const diceMatch = PARSE_RESULT_PATTERNS.dynamicDice.exec(this.resultat!.dice);
		if (!diceMatch) return resultEdited;
		const diceOnly = diceMatch[1];
		const parenMatch = PARSE_RESULT_PATTERNS.parenExpression.exec(diceOnly);
		if (!parenMatch) return resultEdited;
		try {
			const expression = parenMatch[1];
			const evaluated = evaluate(expression);
			const simplifiedDice = diceOnly.replace(parenMatch[0], evaluated.toString());
			const beforeArrow = resultEdited.substring(0, arrowPos);
			const afterArrow = resultEdited.substring(arrowPos);
			const dicePos = beforeArrow.indexOf(diceOnly);
			const simplifiedPos = dicePos === -1 ? beforeArrow.indexOf(simplifiedDice) : -1;
			const foundPos = dicePos !== -1 ? dicePos : simplifiedPos;
			const foundDice = dicePos !== -1 ? diceOnly : simplifiedDice;
			const hasComparison =
				foundPos !== -1
					? PARSE_RESULT_PATTERNS.mathsSigns.test(
							beforeArrow.substring(foundPos + foundDice.length)
						)
					: PARSE_RESULT_PATTERNS.mathsSigns.test(beforeArrow.replace(/`/g, ""));

			if (hasComparison) {
				const isMultiSegment = (this.resultat?.result || "").includes(";");
				const isSharedCompareLine =
					isMultiSegment && PARSE_RESULT_PATTERNS.allSharedSymbols.test(beforeArrow);

				if (isSharedCompareLine) {
					const updatedBefore =
						dicePos !== -1 ? beforeArrow.replace(diceOnly, simplifiedDice) : beforeArrow;
					const updatedAfter = afterArrow.replaceAll(diceOnly, simplifiedDice);
					return `${updatedBefore}${updatedAfter}`;
				}
				return resultEdited;
			}
			const sharedPrefixMatch = beforeArrow.match(PARSE_RESULT_PATTERNS.beforeArrow);
			const prefix = sharedPrefixMatch ? sharedPrefixMatch[0] : "";
			const core = beforeArrow.substring(prefix.length);
			const isSharedContext =
				prefix.includes("※") || (this.resultat?.result || "").includes(";");
			let mappedCore: string;
			const mapping = isSharedContext
				? `\`${diceOnly}\` | ${simplifiedDice}`
				: `\`${diceOnly}\` | \`${simplifiedDice}\``;

			if (core.includes(diceOnly)) mappedCore = core.replace(diceOnly, mapping);
			else if (core.includes(simplifiedDice))
				mappedCore = core.replace(simplifiedDice, mapping);
			else mappedCore = mapping;
			return `${prefix}${mappedCore}${afterArrow}`;
		} catch (e) {
			logger.warn("Failed to evaluate dynamic dice expression:", e);
			return resultEdited;
		}
	}
	private message(result: string, tot?: string | number) {
		if (result.includes("◈")) tot = undefined;
		let resultEdited = `${result.replaceAll(";", "\n").replaceAll(":", " ⟶")}`;
		if (this.resultat?.dice?.includes("("))
			resultEdited = this.parseParenthesis(resultEdited);
		resultEdited = resultEdited.replaceAll(";", "\n").replaceAll(":", " ⟶");
		resultEdited = resultEdited.replaceAll("⁚", ":");
		if (!tot)
			resultEdited = `${resultEdited.replaceAll(PARSE_RESULT_PATTERNS.resultEquals, " = ` $1 `")}`;
		else
			resultEdited = `${resultEdited.replaceAll(PARSE_RESULT_PATTERNS.resultEquals, `${tot}`)}`;
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
		this.headerCompare = undefined;
		const messageResult = this.resultat.result.split(";");
		const isSharedRoll = messageResult.length > 1;
		let msgSuccess: string;

		if (this.resultat.compare) {
			msgSuccess = this.compare(messageResult, critical, customCritical, opposition);
		} else {
			const hasStatsPerSegment = this.statsPerSegment && this.statsPerSegment.length > 0;
			if (messageResult.length > 1) {
				msgSuccess = "";
				for (let i = 0; i < messageResult.length; i++) {
					let r = messageResult[i];
					const commentIndex = i + this.hiddenSegments;
					if (hasStatsPerSegment && this.commentsPerSegment?.[commentIndex]) {
						const commentToRemove = this.commentsPerSegment[commentIndex];
						r = r.replace(`[${commentToRemove}]`, "").trim();
					}
					const marker = hasStatsPerSegment ? "⚐" : "";
					msgSuccess += `${marker}${this.message(r, " = ` [$1] `")}`;
					msgSuccess += "\n";
				}
			} else msgSuccess = this.message(this.resultat.result, " = ` [$1] `");
		}
		const comment = this.comment(interaction);
		const finalRes = this.formatMultipleRes(msgSuccess);
		const hasComment = comment.trim().length > 0 && comment !== "_ _";
		const separator = hasComment ? "\n  " : "\n ";
		const joinedRes = finalRes.filter((x) => x.trim().length > 0).join(separator);
		if (hasComment) return ` ${comment} ${joinedRes.trimEnd()}`;
		if (comment === "\n") return `${isSharedRoll ? " " : "\n "}${joinedRes}`;
		return ` ${joinedRes}`;
	}

	/**
	 * A segment the engine already judged (`✓ 1d100<=65: [20] = 20<=65`): its verdict is in the
	 * symbol and the engine already inverted the sign on a failure, but its criticals still have
	 * to be resolved against its own dice. Rebuilt in the shape `display()` gives the main
	 * segment — comparator out of the displayed dice, comparison only in the final value.
	 */
	private comparedSegment(
		r: string,
		critical?: { failure?: number; success?: number },
		customCritical?: Record<string, CustomCritical>
	): string {
		const cut = r.lastIndexOf(" = ");
		const head = cut === -1 ? r : r.slice(0, cut);
		const tail = cut === -1 ? "" : r.slice(cut + 3);
		const compared = PARSE_RESULT_PATTERNS.comparedTail.exec(tail);
		const total = Number.parseInt(compared?.groups?.total ?? tail, 10) || 0;
		const natural: number[] = [];
		this.naturalDice(r, natural);
		const verdict =
			this.critical(natural, total, critical, customCritical)?.successOrFailure ??
			`**${this.ul(r.startsWith("✓") ? "roll.success" : "roll.failure")}**`;
		const rendered = compared?.groups
			? this.message(
					`${head.replace(PARSE_RESULT_PATTERNS.compareSuffix, "")} = ${total}`,
					` = \`[${total}] ${asciiSign(compared.groups.sign)} ${compared.groups.value}\``
				)
			: this.message(r);
		return rendered.replace(PARSE_RESULT_PATTERNS.formulaDiceSymbols, `◈ ${verdict} —`);
	}

	private compare(
		messageResult: string[],
		critical?: { failure?: number; success?: number },
		customCritical?: Record<string, CustomCritical>,
		opposition?: ComparedValue
	): string {
		let msgSuccess = "";

		for (const r of messageResult) {
			if (r.match(PARSE_RESULT_PATTERNS.formulaDiceSymbols)) {
				msgSuccess += `${this.comparedSegment(r, critical, customCritical)}\n`;
				continue;
			}

			const natural: number[] = [];
			let isCritical: undefined | "failure" | "success" | "custom";
			const result = this.roll(r, opposition);
			const total = result.total;
			let successOrFailure = result.successOrFailure;
			const oldCompare = result.oldCompare;

			this.naturalDice(r, natural);

			const criticalResult = this.critical(natural, total, critical, customCritical);
			if (criticalResult) {
				successOrFailure = criticalResult.successOrFailure;
				isCritical = criticalResult.isCritical;
			}

			msgSuccess += this.display(
				r,
				total,
				oldCompare,
				isCritical,
				opposition,
				successOrFailure,
				customCritical
			);
		}

		return msgSuccess;
	}

	private roll(r: string, opposition?: ComparedValue) {
		const tot = r.split(" = ");
		let total = Number.parseInt(tot[tot.length - 1], 10);
		if (Number.isNaN(total)) total = 0;

		const resultOfCompare = evaluate(
			`${total} ${this.resultat!.compare!.sign} ${this.resultat!.compare!.value}`
		);

		let successOrFailure = resultOfCompare
			? `**${this.ul("roll.success")}**`
			: `**${this.ul("roll.failure")}**`;

		let oldCompare: ComparedValue | undefined;
		if (opposition && resultOfCompare) {
			const newCompare = evaluate(`${total} ${opposition.sign} ${opposition.value}`);
			oldCompare = structuredClone(this.resultat!.compare);
			successOrFailure = newCompare
				? `**${this.ul("roll.success")}**`
				: `**${this.ul("roll.failure")}**`;
			if (newCompare) this.resultat!.compare = opposition;
			else this.resultat!.compare = opposition;
		}
		if (this.resultat?.compare) {
			const { rollValue, value, trivial, originalDice } = this.resultat.compare;
			if (value === 0 && trivial && !isResolvedComparator(rollValue, originalDice))
				throw new DiceTypeError(
					originalDice ?? this.resultat.dice,
					"invalidDice.compare",
					{
						total,
						compare: asciiSign(this.resultat.compare.sign),
						rollValue,
					}
				);
		}
		return { oldCompare, successOrFailure, total };
	}

	private naturalDice(r: string, natural: number[]) {
		const naturalDice = r.matchAll(PARSE_RESULT_PATTERNS.naturalDice);
		for (const dice of naturalDice) natural.push(Number.parseInt(dice[1], 10));
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
			const failure = critical.failure || undefined;
			const success = critical.success || undefined;
			if (failure !== undefined && natural.includes(failure))
				return {
					isCritical: "failure",
					successOrFailure: `**${this.ul("roll.critical.failure")}**`,
				};

			if (success !== undefined && natural.includes(success))
				return {
					isCritical: "success",
					successOrFailure: `**${this.ul("roll.critical.success")}**`,
				};
		}

		if (customCritical) {
			for (const [name, custom] of Object.entries(customCritical)) {
				const valueToCompare = custom.onNaturalDice ? natural : total;
				let success: unknown;

				if (custom.onNaturalDice)
					success = natural.includes(Number.parseInt(custom.value, 10));
				else success = evaluate(`${valueToCompare} ${custom.sign} ${custom.value}`);

				if (success) {
					return {
						isCritical: "custom",
						successOrFailure: `**${name}**`,
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
		const testValue = this.resultat!.compare;
		let displayCompare = testValue;
		let goodSign = this.goodCompareSign(testValue!, total);

		if (isCritical === "custom" && customCritical) {
			for (const [, custom] of Object.entries(customCritical)) {
				const valueToCompare = custom.onNaturalDice ? [] : total;
				let success: unknown;
				if (custom.onNaturalDice) success = true;
				else success = evaluate(`${valueToCompare} ${custom.sign} ${custom.value}`);

				if (success) {
					const isBulkRoll =
						this.resultat?.dice?.includes("#d") ||
						(this.resultat?.result?.includes(";") ?? false);
					if (!isBulkRoll)
						this.headerCompare = this.convertCustomCriticalToCompare(custom);
					else {
						displayCompare = this.convertCustomCriticalToCompare(custom);
						goodSign = this.goodCompareSign(displayCompare, total);
					}
					break;
				}
			}
		}

		let oldCompareStr = "";
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

		const totalSuccess = displayCompare
			? ` = \`[${total}] ${asciiSign(goodSign)} ${this.formatCompare(displayCompare, "`")}${text}${oldCompareStr}`
			: `= \`[${total}]\``;

		const resMsg = this.message(r, totalSuccess);
		if (resMsg.match(PARSE_RESULT_PATTERNS.formulaDiceSymbols)) {
			return `${this.message(r, totalSuccess).replace(PARSE_RESULT_PATTERNS.formulaDiceSymbols, `${successOrFailure} — `)}\n`;
		}
		if (resMsg.startsWith("※")) {
			const withoutSymbol = resMsg.replace(/^※\s*/, "");
			// The engine already embeds the main segment's own comment ahead of the verdict.
			const header =
				PARSE_RESULT_PATTERNS.sharedCommentHeader.exec(withoutSymbol)?.[0] ?? "";
			const rest = withoutSymbol.slice(header.length);
			return `※ ${header}${successOrFailure} — ${rest}\n`;
		}
		if (resMsg.startsWith("◈")) return `${resMsg}\n`;
		return `${successOrFailure} — ${resMsg}\n`;
	}

	private setIgnoreCount(comment: string | undefined = this.resultat?.comment) {
		if (this.ignoreCount !== "") return this.ignoreCount;
		if (
			comment?.includes(IGNORE_COUNT_KEY.key) ||
			comment?.includes(IGNORE_COUNT_KEY.emoji)
		)
			return ` ${IGNORE_COUNT_KEY.emoji} `;
		return "";
	}

	/**
	 * The engine drops the parenthesised common segment of a shared roll from its output, so the
	 * per-segment metadata — indexed on the dice — starts one segment ahead of the rendered lines.
	 */
	private countHiddenSegments(): number {
		if (!this.resultat?.dice?.includes(";")) return 0;
		const segments = this.resultat.dice.split(";").length;
		return Math.max(0, segments - this.resultat.result.split(";").length);
	}

	private extractCommentsPerSegment(): string[] | undefined {
		if (!this.resultat?.dice?.includes(";")) return undefined;
		const segments = this.resultat.dice.split(";");
		const comments: string[] = [];

		for (const segment of segments) {
			const commentMatch = segment.match(PARSE_RESULT_PATTERNS.commentBracket);
			comments.push(commentMatch ? commentMatch[1] : "");
		}
		return comments.some((c) => c.trim().length > 0) ? comments : undefined;
	}

	private removeIgnore(comment: string | undefined): string | undefined {
		if (comment) {
			const com = comment
				.replaceAll(IGNORE_COUNT_KEY.key, "")
				.replaceAll(IGNORE_COUNT_KEY.emoji, "")
				.trim();
			if (com.trimAll() === "#") return undefined;
			return com;
		}
		return comment;
	}

	private comment(interaction?: boolean): string {
		const extractorInfo = PARSE_RESULT_PATTERNS.extractInfo.exec(
			this.resultat!.comment || ""
		);
		let info = "";

		if (extractorInfo?.[1]) {
			info = `${extractorInfo[1]} `;
			this.resultat!.comment = this.resultat!.comment?.replace(
				PARSE_RESULT_PATTERNS.extractInfo,
				""
			).trim();
		}
		this.resultat!.comment = this.removeIgnore(this.resultat!.comment);

		const hasStatsPerSegment = this.statsPerSegment && this.statsPerSegment.length > 0;
		const sanitizedComment = this.resultat!.comment?.replaceAll(/(\\\*|\*\/|\/\*)/g, "")
			.replace(/^#\s*/u, "")
			.replaceAll("×", "*")
			.trim();
		return this.resultat!.comment
			? `${info}*${sanitizedComment}*\n `
			: interaction || hasStatsPerSegment
				? `${info ? `${info}\n` : "\n"}`
				: `${info ? `${info}\n` : ""}_ _`;
	}

	private formatMultipleRes(msgSuccess: string): string[] {
		const splitted = msgSuccess.split("\n");
		const finalRes = [];
		let segmentIndex = 0;

		for (let res of splitted) {
			const matches = PARSE_RESULT_PATTERNS.diceResultPattern.exec(res);
			if (matches) {
				const { entry, calc } = matches.groups || {};
				const isShared =
					(this.resultat?.result || "").includes(";") ||
					(this.statsPerSegment && this.statsPerSegment.length > 0);
				const hasCompare = !!this.resultat?.compare;
				const isSimpleDynamic =
					!isShared && !hasCompare && !!entry && entry.includes(":");
				const entryIsBracketed = !!entry && /^\s*\[.*\]\s*$/.test(entry);
				const entryHasPipeMapping = !!entry && entry.includes(" | ");
				const entryHasBackticks = !!entry && entry.includes("`");
				if (entry) {
					const entryStr = entry.replaceAll("\\*", "×");
					if (
						!isSimpleDynamic &&
						!(isShared && entryIsBracketed) &&
						!entryHasPipeMapping &&
						!entryHasBackticks
					)
						res = res.replace(entry, `\`${entryStr.trim()}\``);
					else res = res.replace(entry, `${entryStr.trim()}`);
				}
				if (calc) {
					const calcStr = calc.replaceAll("\\*", "×");
					res = res.replace(calc, `\`${calcStr.trim()}\``);
				}
			}
			res = this.formatCriticalSymbols(res);
			const hasStats = this.statsPerSegment && this.statsPerSegment.length > 0;
			const hasComments = this.commentsPerSegment && this.commentsPerSegment.length > 0;

			if (hasStats || hasComments) {
				const hasSharedSymbol = res.match(PARSE_RESULT_PATTERNS.sharedSymbol);
				const hasMarker = res.startsWith("⚐");
				const isDiceResult = res.includes(" ⟶ ");

				if (hasMarker) res = res.substring(1);

				const index = segmentIndex + this.hiddenSegments;
				if (
					(hasSharedSymbol || hasMarker || isDiceResult) &&
					index <
						Math.max(
							this.statsPerSegment?.length ?? 0,
							this.commentsPerSegment?.length ?? 0
						)
				) {
					const statName = this.statsPerSegment?.[index] || "";
					const commentSource = this.commentsPerSegment?.[index] || "";
					const comment = this.removeIgnore(commentSource) || "";
					this.ignoreCount = this.setIgnoreCount(commentSource);

					const parts: string[] = [];
					if (statName) parts.push(`__${statName}__`);
					if (comment) parts.push(`__${comment}__`);

					if (parts.length > 0) {
						const header = parts.join(" — ");

						const sharedPrefix = PARSE_RESULT_PATTERNS.sharedStartSymbol.exec(res);
						if (sharedPrefix) {
							// The engine already prints a segment's own comment on its line; only the
							// compared (`✓`/`✕`) segments arrive bare.
							const symbol = sharedPrefix[1];
							if (!res.includes(`__${comment}__`))
								res = res.replace(sharedPrefix[0], `${symbol} ${header} — `);
							else if (statName && !res.includes(`__${statName}__`))
								res = res.replace(sharedPrefix[0], `${symbol} __${statName}__ — `);
						} else if (isDiceResult && !hasSharedSymbol) {
							const symbol = segmentIndex === 0 ? "※" : "◈";
							let cleanRes = res;
							if (comment) {
								cleanRes = cleanRes.replace(`__${comment}__ — `, "").trim();
								cleanRes = cleanRes.replace(`[${comment}]`, "").trim();
							}
							if (statName) cleanRes = cleanRes.replace(`__${statName}__`, "").trim();
							cleanRes = cleanRes
								.replace(PARSE_RESULT_PATTERNS.sharedStartSymbol, "")
								.replace(/\s*—\s*/g, " — ")
								.replace(/^—\s*|\s*—$/g, "")
								.replace(/—\s*—/g, "—")
								.trim();
							res = `${symbol} ${header} — ${cleanRes}`;
						}
					}
					segmentIndex++;
				}
			}
			finalRes.push(res.trimStart());
		}
		return finalRes;
	}

	/** Fallback for the segments `compare()` never sees — a shared roll without a global compare. */
	private formatCriticalSymbols(res: string): string {
		return res
			.replace("✕", `◈ **${this.ul("roll.failure")}** —`)
			.replace("✓", `◈ **${this.ul("roll.success")}** —`);
	}

	private chained(
		total: number,
		oldCompare: ComparedValue,
		is: "opposition" | "base" | "other" = "other"
	): string {
		const goodSignOld = this.goodCompareSign(oldCompare, total);
		const text = this.ul(`roll.${is}`);
		return ` ${AND} \`${asciiSign(goodSignOld)} ${this.formatCompare(oldCompare, "`")}${text}`;
	}

	private formatCompare(compare?: ComparedValue, lastChar?: string) {
		const char = lastChar ? lastChar : "";
		if (compare?.rollValue && !compare.originalDice)
			return `${compare.rollValue} ═ ${compare.value}${char}`;
		if (compare?.rollValue) return `${compare.rollValue.replaceAll("=", "═")}${char}`;
		if (compare?.value) return `${compare.value}${char}`;
		return `${this.resultat?.compare?.value}${char}`;
	}

	private goodCompareSign(compare: Compare, total: number): AsciiSign {
		const { sign, value } = compare;
		const success = evaluate(`${total} ${sign} ${value}`);
		if (success) {
			return sign.replace(">=", "⩾").replace("<=", "⩽") as AsciiSign;
		}
		return goodSign(sign);
	}

	onMessageSend(
		context?: { guildId: string; channelId: string; messageId: string } | string,
		authorId?: string
	) {
		let linkToOriginal = "";
		if (typeof context === "object")
			linkToOriginal = this.createUrl({
				channelId: context.channelId,
				guildId: context.guildId,
				messageId: context.messageId,
			});
		else if (context) linkToOriginal = this.createUrl(undefined, context);
		let mention = authorId ? `*<@${authorId}>*` : "";
		if (this.charName)
			mention = `**__${this.charName.capitalize()}__**${mention.length > 0 ? ` (${mention})` : ""}`;
		let compareHint = "";
		const header = this.headerCompare ?? this.resultat?.compare;
		const isSharedRoll = PARSE_RESULT_PATTERNS.allSharedSymbols.test(
			this.resultat?.result || ""
		);
		if (header && !isSharedRoll)
			compareHint = ` (\`${asciiSign(header.sign)} ${this.formatCompare(header)}\`)`;
		const headerLine = `${mention}${compareHint}${this.ignoreCount}${timestamp(this.data.config?.timestamp)}`;
		const showGlobalInfoRoll =
			this.infoRoll && (!this.statsPerSegment || this.statsPerSegment.length === 0);
		const isMultiSegmentRoll = (this.resultat?.result || "").includes(";");
		const hasComment = !!this.resultat?.comment;
		const infoLine = showGlobalInfoRoll
			? `\n[__${this.infoRoll!.name.capitalize()}__]${isMultiSegmentRoll && !hasComment ? "\n" : ""}`
			: "\n";
		return `${headerLine}${infoLine}${this.parser}${linkToOriginal}`;
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
