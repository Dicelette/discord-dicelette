import type { Compare, ComparedValue, CustomCritical, Resultat } from "@dicelette/core";
import {
	AND,
	type CustomCriticalRoll,
	IGNORE_COUNT_KEY,
	type Translation,
} from "@dicelette/types";
import { evaluate } from "mathjs";
import type { Server } from "./interfaces";
import { createUrl, timestamp } from "./utils";
import "uniformize";
import { ln } from "@dicelette/localization";
import { logger, PARSE_RESULT_PATTERNS } from "@dicelette/utils";

export class ResultAsText {
	parser?: string;
	error?: boolean;
	output: string;
	private readonly data: Server;
	private readonly ul: Translation;
	private readonly charName?: string;
	private readonly infoRoll?: { name: string; standardized: string };
	private readonly resultat?: Resultat;
	private headerCompare?: ComparedValue;
	private readonly statsPerSegment?: string[];
	private readonly commentsPerSegment?: string[];

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
		this.statsPerSegment = statsPerSegment;
		this.commentsPerSegment = this.extractCommentsPerSegment();
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
		if (header) {
			compareHint = ` (\`${header.sign} ${this.formatCompare(header)}\`)`;
		}
		if (user.trim().length > 0) user += `${this.ul("common.space")}${compareHint}:\n`;
		// For shared rolls with statsPerSegment, don't show global infoRoll
		// as stat names are displayed per segment next to ※/◈ symbols
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

	private message(result: string, tot?: string | number) {
		if (result.includes("◈")) tot = undefined;
		let resultEdited = result;

		// Check if original dice string contains dynamic dice with parentheses
		// We need to match segments from this.resultat.dice to the current result segment
		if (this.resultat?.dice?.includes("(") && result.includes(":")) {
			// Split the original dice into segments
			const diceSegments = this.resultat.dice.split(";");

			// Find the matching segment by checking if result starts with evaluated dice
			for (const diceSegment of diceSegments) {
				// Skip segments that don't contain parentheses
				if (!diceSegment.includes("(")) continue;

				// Remove comment from dice segment for matching
				const cleanDiceSegment = diceSegment.replace(/\[([^\]]+)\]/g, "").trim();
				// Remove comparator for matching (>5, >=10, etc.)
				const diceWithoutComparator = cleanDiceSegment.replace(/[><=!]+\d+$/, "").trim();

				const diceMatch = PARSE_RESULT_PATTERNS.dynamicDice.exec(diceWithoutComparator);
				if (diceMatch) {
					const diceOnly = diceMatch[1];
					const parenMatch = PARSE_RESULT_PATTERNS.parenExpression.exec(diceOnly);
					if (parenMatch) {
						try {
							const expression = parenMatch[1];
							const evaluated = evaluate(expression);
							const simplifiedDice = diceOnly.replace(
								parenMatch[0],
								evaluated.toString()
							);

							// Check if the current result segment matches this evaluated dice
							const colonPos = result.indexOf(":");
							if (colonPos !== -1) {
								const resultDicePart = result.substring(0, colonPos).trim();
								// Remove leading symbols like ✓ or ✕
								const cleanResultDice = resultDicePart.replace(/^[✕✓]\s*/, "");

								// Only replace if it's an exact match (not just contained)
								// This prevents replacing "1d60" in "1d60+2" when we already processed "1d60"
								if (cleanResultDice === simplifiedDice) {
									resultEdited = resultEdited.replace(
										cleanResultDice,
										`\`${diceOnly}\`: ${simplifiedDice}`
									);
									break; // Found the match, no need to continue
								}
							}
						} catch (e) {
							// If evaluation fails, keep original result
							logger.warn("Failed to evaluate dynamic dice expression:", e);
						}
					}
				}
			}
		}

		// Apply standard transformations after dynamic dice processing
		resultEdited = resultEdited.replaceAll(";", "\n").replaceAll(":", " ⟶");

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

		// Reset hint comparison for header at the beginning of parsing
		this.headerCompare = undefined;

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
			// Process each segment separately for shared rolls
			const hasStatsPerSegment = this.statsPerSegment && this.statsPerSegment.length > 0;
			// If we have multiple segments (with or without statsPerSegment), process them individually
			if (messageResult.length > 1) {
				msgSuccess = "";
				for (let i = 0; i < messageResult.length; i++) {
					let r = messageResult[i];
					// Remove comment from segment if we're processing shared rolls with stats
					// The comment will be added back by formatMultipleRes via commentsPerSegment
					if (hasStatsPerSegment && this.commentsPerSegment?.[i]) {
						const commentToRemove = this.commentsPerSegment[i];
						r = r.replace(`[${commentToRemove}]`, "").trim();
					}
					// Add a marker that formatMultipleRes can detect
					const marker = hasStatsPerSegment ? "⚐" : "";
					msgSuccess += `${marker}${this.message(r, " = ` [$1] `")}\n`;
				}
			} else msgSuccess = this.message(this.resultat.result, " = ` [$1] `");
		}

		const comment = this.comment(interaction);
		const finalRes = this.formatMultipleRes(msgSuccess, criticalState);
		const hasComment = comment.trim().length > 0 && comment !== "_ _";
		const joinedRes = finalRes.join("\n ");
		// If comment contains only whitespace/newline, don't add extra space
		if (hasComment) {
			return ` ${comment} ${joinedRes.trimEnd()}`;
		}
		// For interaction without comment, comment() returns "\n", so prepend newline to joinedRes
		if (comment === "\n") {
			return `\n ${joinedRes}`;
		}
		// Default case (non-interaction without comment): add space before result
		return ` ${joinedRes}`;
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
		let msgSuccess = "";
		let total = 0;
		const natural: number[] = [];
		let isCritical: undefined | "failure" | "success" | "custom";
		let successOrFailure = "";

		for (const r of messageResult) {
			if (r.match(PARSE_RESULT_PATTERNS.formulaDiceSymbols)) {
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

		return { criticalState: { isCritical, successOrFailure }, msgSuccess };
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

			// Update current comparison only if opposition is successful
			if (newCompare) this.resultat!.compare = opposition;
			// If the opposition fails, the original comparison is retained but the failure is displayed.
			else this.resultat!.compare = opposition;
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
			if (critical.failure && natural.includes(critical.failure))
				return {
					isCritical: "failure",
					successOrFailure: `**${this.ul("roll.critical.failure")}**`,
				};

			if (critical.success && natural.includes(critical.success))
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
		const goodSign = this.goodCompareSign(testValue!, total);

		if (isCritical === "custom" && customCritical) {
			for (const [, custom] of Object.entries(customCritical)) {
				const valueToCompare = custom.onNaturalDice ? [] : total;
				let success: unknown;
				if (custom.onNaturalDice)
					success = true; // If we arrive here, the custom critical has been triggered.
				else success = evaluate(`${valueToCompare} ${custom.sign} ${custom.value}`);

				if (success) {
					// Keep the CC comparison to display it next to the username,
					// but keep the message displayed on the stat (basic comparison)
					this.headerCompare = this.convertCustomCriticalToCompare(custom);
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
			? ` = \`[${total}] ${this.asciiSign(goodSign)} ${this.formatCompare(testValue, "`")}${text}${oldCompareStr}`
			: `= \`[${total}]\``;

		const resMsg = this.message(r, totalSuccess);
		if (resMsg.match(PARSE_RESULT_PATTERNS.formulaDiceSymbols)) {
			return `${this.message(r, totalSuccess).replace(PARSE_RESULT_PATTERNS.formulaDiceSymbols, `${successOrFailure} — `)}\n`;
		}
		if (resMsg.startsWith("※")) {
			return `${resMsg}\n`;
		}
		return `${successOrFailure} — ${resMsg}\n`;
	}

	private setIgnoreCount(comment: string | undefined = this.resultat?.comment) {
		if (this.ignoreCount !== "") return this.ignoreCount;
		if (comment?.includes(IGNORE_COUNT_KEY.key)) return ` ${IGNORE_COUNT_KEY.emoji} `;
		return "";
	}

	private extractCommentsPerSegment(): string[] | undefined {
		if (!this.resultat?.dice || !this.resultat.dice.includes(";")) return undefined;
		const segments = this.resultat.dice.split(";");
		const comments: string[] = [];

		for (const segment of segments) {
			const commentMatch = segment.match(PARSE_RESULT_PATTERNS.commentBracket);
			comments.push(commentMatch ? commentMatch[1] : "");
		}

		return comments.length > 0 ? comments : undefined;
	}

	private removeIgnore(comment: string | undefined): string | undefined {
		if (comment) {
			const com = comment.replaceAll(IGNORE_COUNT_KEY.key, "").trim();
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
		return this.resultat!.comment
			? `${info}*${this.resultat!.comment.replaceAll(/(\\\*|#|\*\/|\/\*)/g, "")
					.replaceAll("×", "*")
					.trim()}*\n `
			: interaction || hasStatsPerSegment
				? `${info ? `${info}\n` : "\n"}`
				: `${info ? `${info}\n` : ""}_ _`;
	}

	private formatMultipleRes(
		msgSuccess: string,
		criticalState: {
			isCritical?: "failure" | "success" | "custom";
			successOrFailure?: string;
		}
	): string[] {
		const splitted = msgSuccess.split("\n");
		const finalRes = [];
		let segmentIndex = 0;

		for (let res of splitted) {
			const matches = PARSE_RESULT_PATTERNS.diceResultPattern.exec(res);
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

			// Inject stat names and/or comments for shared rolls next to ※ or ◈ symbols
			const hasStats = this.statsPerSegment && this.statsPerSegment.length > 0;
			const hasComments = this.commentsPerSegment && this.commentsPerSegment.length > 0;

			if (hasStats || hasComments) {
				const hasSharedSymbol = res.match(PARSE_RESULT_PATTERNS.sharedSymbol);
				// Detect if this is a dice result line with our marker or with ⟶ symbol
				const hasMarker = res.startsWith("⚐");
				const isDiceResult = res.includes(" ⟶ ");

				// Remove the marker if present
				if (hasMarker) {
					res = res.substring(1);
				}
				if (
					(hasSharedSymbol || hasMarker || isDiceResult) &&
					segmentIndex <
						Math.max(
							this.statsPerSegment?.length ?? 0,
							this.commentsPerSegment?.length ?? 0
						)
				) {
					const statName = this.statsPerSegment?.[segmentIndex] || "";
					const commentSource = this.commentsPerSegment?.[segmentIndex] || "";
					const comment = this.removeIgnore(commentSource) || "";
					this.ignoreCount = this.setIgnoreCount(commentSource);

					const parts: string[] = [];
					if (statName) parts.push(`__${statName}__`);
					if (comment) parts.push(`__${comment}__`);

					if (parts.length > 0) {
						const header = parts.join(" — ");

						if (res.match(PARSE_RESULT_PATTERNS.successSymbol)) {
							res = res.replace(
								PARSE_RESULT_PATTERNS.sharedStartSymbol,
								`◈ ${header} — `
							);
						} else if (res.startsWith("※")) {
							// Remove the existing ※ and add it back with the header
							if (!res.includes(`__${comment}__`))
								res = res.replace(/^※\s*/, `※ ${header} — `);
							else if (statName && !res.includes(`__${statName}__`))
								res = res.replace(/^※\s*/, `※ __${statName}__ — `);
						} else if (isDiceResult && !hasSharedSymbol) {
							// For lines without symbols but with dice results
							// Use ※ for first segment, ◈ for subsequent ones
							const symbol = segmentIndex === 0 ? "※" : "◈";
							// Remove any existing comment/statName already present in res to avoid duplication
							let cleanRes = res;
							// The comment might appear as __comment__ or [comment] in the result
							if (comment) {
								cleanRes = cleanRes.replace(`__${comment}__ — `, "").trim();
								cleanRes = cleanRes.replace(`[${comment}]`, "").trim();
							}
							if (statName) cleanRes = cleanRes.replace(`__${statName}__`, "").trim();

							// Clean up any multiple or leading/trailing separators
							cleanRes = cleanRes
								.replace(PARSE_RESULT_PATTERNS.sharedStartSymbol, "")
								.replace(/\s*—\s*/g, " — ") // Normalize all separators
								.replace(/^—\s*|\s*—$/g, "") // Remove leading/trailing separators
								.replace(/—\s*—/g, "—") // Remove double separators
								.trim();
							res = `${symbol} ${header} — ${cleanRes}`;
						}
					}
					// Incrémenter pour passer au segment suivant
					segmentIndex++;
				}
			}
			finalRes.push(res.trimStart());
		}
		return finalRes;
	}

	private formatCriticalSymbols(
		res: string,
		isCritical: undefined | "failure" | "success" | "custom",
		successOrFailure?: string
	): string {
		if (isCritical === "failure")
			return res.replace("✕", `◈ **${this.ul("roll.critical.failure")}** —`);

		if (isCritical === "success")
			return res.replace("✓", `◈ **${this.ul("roll.critical.success")}** —`);

		if (isCritical === "custom")
			return res.replace(
				PARSE_RESULT_PATTERNS.formulaDiceSymbols,
				`${successOrFailure} —`
			);

		// Ne pas remplacer le symbole ※ qui est utilisé pour les rolls sans comparaison
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
		return ` ${AND} \`${this.asciiSign(goodSignOld)} ${this.formatCompare(oldCompare, "`")}${text}`;
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
				return "!=";
			case "!=":
				return "==";
			case "==":
				return "!=";
			default:
				return "";
		}
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

		// Build the reference (character > author if available)
		let mention = authorId ? `*<@${authorId}>*` : "";
		if (this.charName)
			mention = `**__${this.charName.capitalize()}__**${mention.length > 0 ? ` (${mention})` : ""}`;

		// Display only the comparison next to the username
		let compareHint = "";
		const header = this.headerCompare ?? this.resultat?.compare;
		if (header)
			compareHint = ` (\`${this.asciiSign(header.sign)} ${this.formatCompare(header)}\`)`;

		const headerLine = `${mention}${compareHint}${this.ignoreCount}${timestamp(this.data.config?.timestamp)}`;
		// For shared rolls with statsPerSegment, don't show global infoRoll
		// as stat names are displayed per segment next to ※/◈ symbols
		const showGlobalInfoRoll =
			this.infoRoll && (!this.statsPerSegment || this.statsPerSegment.length === 0);
		const infoLine = showGlobalInfoRoll
			? `\n[__${this.infoRoll!.name.capitalize()}__]`
			: "\n";
		return `${headerLine}${infoLine}${this.parser}${linkToOriginal}`;
	}

	private asciiSign(sign: string) {
		if (sign === "!=") return "≠";
		if (sign === "==") return "═";
		if (sign === ">=") return "⩾";
		if (sign === "<=") return "⩽";
		return sign;
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
