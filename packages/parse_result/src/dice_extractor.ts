/** biome-ignore-all lint/style/useNamingConvention: variable */
import {
	DETECT_CRITICAL_ALL,
	findBestStatMatch,
	MIN_THRESHOLD_MATCH,
	REMOVER_PATTERN,
	type Resultat,
	replaceFormulaInDice,
	roll,
	type SortOrder,
	splitDiceComment,
	verifyStatMatcherPattern,
} from "@dicelette/core";
import type {
	ChainedComments,
	DiceData,
	DiceExtractionResult,
	Translation,
	UserData,
} from "@dicelette/types";
import {
	bareComment,
	DICE_COMPILED_PATTERNS,
	DICE_PATTERNS,
	FORMULA_BLOCK_SOURCE,
	logger,
	maskBracketComments,
	stripBareComment,
} from "@dicelette/utils";
import { evaluate } from "mathjs";
import {
	extractAndMergeComments,
	getComments,
	splitGlobalComment,
} from "./comment_utils";
import { extractOpposition, trimAll } from "./utils";

/** Matches a `{{...}}` formula block, to neutralize it before opposition detection (so a comparator inside an
 * unresolved `$stat` isn't mistaken for an opposition). */
export const FORMULA_BLOCK_PATTERN = new RegExp(FORMULA_BLOCK_SOURCE, "g");

export function extractDiceData(content: string): DiceData {
	// Strip the %%...%% info marker before matching.
	const bracketRoll = content
		.replace(/%%.*%%/, "")
		.match(DICE_PATTERNS.BRACKET_ROLL)?.[1];
	const comments = bareComment(content)?.replaceAll("*", "\\*");
	const diceValue = content.match(DICE_PATTERNS.DICE_VALUE);

	return {
		bracketRoll,
		comments,
		diceValue,
	};
}

export function hasValidDice(diceData: DiceData): boolean {
	const { bracketRoll, comments, diceValue } = diceData;
	if (comments && !bracketRoll) return !!diceValue;
	return true;
}

export function processChainedComments(
	content: string,
	comments: string
): ChainedComments {
	if (
		comments.match(DICE_PATTERNS.BRACKET_ROLL) &&
		content.includes("&") &&
		content.includes(";")
	) {
		content = content.match(DICE_PATTERNS.BRACKETED_CONTENT)
			? content.replace(DICE_PATTERNS.BRACKETED_CONTENT, "$1").trim()
			: content;
		const globalComments = getComments(content);
		content = content
			.replace(/%%.*%%/, "")
			.trim()
			.replace(DICE_PATTERNS.GLOBAL_COMMENTS, "")
			.trim();

		return {
			comments: globalComments ?? undefined,
			content,
		};
	}

	const finalContent = stripBareComment(content)
		.replace(/%%.*%%/, "")
		.trimEnd();

	return {
		comments: getComments(content, comments),
		content: finalContent,
	};
}

/** Rolls a cleaned dice expression from `content` or an explicit `bracketRoll`, returning the result and optional info/stat metadata. */
export function performDiceRoll(
	content: string,
	bracketRoll: string | undefined,
	infoRoll?: string,
	pity?: boolean,
	sort?: SortOrder
): { resultat: Resultat | undefined; infoRoll?: string } | undefined {
	try {
		const source = bracketRoll ?? content;
		// `trimAll` strips every `[comment]`, which a shared roll needs the engine to render per
		// segment — so those go through `getRoll`, the same entry point the slash command uses.
		const shared = isSharedRoll(source);
		let rollContent = shared ? source : trimAll(source);

		// Clean markers before the dice parser
		rollContent = rollContent
			.replace(/%%\[__.*?__]%%/g, "")
			.replace(/%{4,}/g, "")
			.replace(/\s*%%+\s*/g, " ")
			.replace(/ @\w+/, "")
			.trimEnd();
		if (/`.*`/.test(rollContent) || /^[\\/]/.test(rollContent)) return undefined;
		if (shared) return { infoRoll, resultat: getRoll(rollContent, pity, sort) };
		// Extract and pass the comment separately so roll() receives a clean dice string
		const { dice: cleanDice, comment } = splitDiceComment(rollContent);
		return { infoRoll, resultat: roll(cleanDice, undefined, pity, sort, comment) };
	} catch (e) {
		logger.warn(e as Error);
		return undefined;
	}
}

export function applyCommentsToResult(
	result: Resultat,
	comments: string | undefined,
	bracketRoll: string | undefined
): Resultat {
	if (comments && !bracketRoll) {
		result.dice = `${result.dice} /* ${comments} */`;
		result.comment = comments;
	}
	return result;
}

/** Evaluate `total <sign> value` for the disable-compare success count. */
function compareTotal(total: number, sign: string, value: number): boolean {
	switch (sign) {
		case ">":
			return total > value;
		case "<":
			return total < value;
		case ">=":
			return total >= value;
		case "<=":
			return total <= value;
		case "!=":
			return total !== value;
		default:
			return total === value; // "==" / "="
	}
}

/** Collapses a compared roll into a 0/1 success count for `disableCompare`, keeping the comparator visible
 * in the dice label. Shared rolls are left untouched. */
function collapseCompareToCount(result?: Resultat): void {
	if (!result?.compare || result.total === undefined || result.result.includes(";"))
		return;
	const { sign, value } = result.compare;
	const numValue = typeof value === "number" ? value : Number(value);
	if (Number.isNaN(numValue)) return;
	const count = compareTotal(result.total, sign, numValue) ? 1 : 0;
	let updated = result.result
		.replace(/^([^:]*?)(\s*:)/, `$1${sign}${value}$2`)
		.replace(/=\s*-?\d+(?:\.\d+)?\s*$/, `= ${count}`);
	// Mirrors pool behavior: marks each die that individually passes the threshold (the total can pass via
	// a modifier even when no die does, so we compare die values, not `count`).
	updated = updated.replace(
		/\[([^\]]+)\]/g,
		(_m, inner) =>
			`[${inner
				.split(",")
				.map((v: string) => {
					const trimmed = v.trimStart();
					const dieValue = Number.parseInt(trimmed, 10);
					if (!Number.isNaN(dieValue) && compareTotal(dieValue, sign, numValue))
						return trimmed.replace(/^(-?\d+)/, "$1×");
					return trimmed;
				})
				.join(",")}]`
	);
	result.result = updated;
	result.total = count;
	result.compare = undefined;
}

/** Processes a chained dice expression (shared segments, stat substitution), cleans comments/opposition, and executes the roll. */
export function processChainedDiceRoll(
	content: string,
	userData?: UserData,
	statsName?: string[],
	pity?: boolean,
	disableCompare?: boolean,
	sort?: SortOrder,
	ul?: Translation,
	replaceUnknown?: string
): { resultat: Resultat; infoRoll?: string; statsPerSegment?: string[] } | undefined {
	let processedContent = content;
	let infoRoll: string | undefined;
	let statsPerSegment: string[] | undefined;
	if (userData?.stats) {
		const res = replaceStatsInDiceFormula(
			content,
			userData.stats,
			false,
			true,
			statsName,
			ul,
			replaceUnknown
		);
		processedContent = res.formula;
		infoRoll = res.infoRoll;
		statsPerSegment = res.statsPerSegment;
	}

	const globalComments = getComments(content);

	let finalContent = processedContent
		.replace(DICE_PATTERNS.GLOBAL_COMMENTS, "")
		.trim()
		.replace(/%%.*%%/, "")
		.trim();

	// getComments() falls back to a bare-text heuristic when no "#" comment is found; GLOBAL_COMMENTS above only
	// strips "#"-marked comments, so leftover bare text (e.g. "4#1d100<=55 cacax") must be stripped here too.
	if (globalComments && finalContent.includes(globalComments))
		finalContent = finalContent.replace(globalComments, "").trim();

	// Evaluates {{...}} formula blocks before opposition detection, so a comparator inside a formula isn't
	// mistaken for a second opposition comparator.
	finalContent = preRollDiceInBrackets(finalContent);
	finalContent = replaceFormulaInDice(finalContent);

	// Remove opposition before rolling (but keep original content for comments)
	finalContent = extractOpposition(finalContent)?.dice ?? finalContent;

	try {
		// Remove critical blocks before rolling
		let cleaned = finalContent.replace(REMOVER_PATTERN.CRITICAL_BLOCK, "");
		if (disableCompare) cleaned = `{${cleaned}}`;
		const rollResult = roll(cleaned, undefined, pity, sort);
		if (!rollResult) return undefined;
		if (disableCompare) collapseCompareToCount(rollResult);
		rollResult.dice = cleaned;
		// For chained rolls (& and ;), only attach the comment if it's a real "#" comment, not bracketed formula text.
		const isChainedRoll = content.includes("&") && content.includes(";");
		const hasHashComment = content.includes("#");
		if (globalComments && (!isChainedRoll || hasHashComment))
			rollResult.comment = globalComments;
		return { infoRoll, resultat: rollResult, statsPerSegment };
	} catch (e) {
		logger.warn(e as Error);
		return undefined;
	}
}

/** Pre-rolls dice notation inside `{{...}}` formula blocks, strips `{cs:...}`/`{cf:...}`, evaluates the numeric
 * expression, and reattaches the critical blocks. @example `{{(90)>=85?69{cs:<=5+((90)-85)}:(90)}}` → `69{cs:<=10}`. */
function preRollDiceInBrackets(content: string): string {
	if (!content.includes("{{")) return content;
	return content.replace(
		new RegExp(FORMULA_BLOCK_SOURCE, "g"),
		(_match, inner: string) => {
			// Roll any dice notation present in the inner content (including inside cs/cf blocks)
			const rolledInner = inner.replace(
				DICE_COMPILED_PATTERNS.DICE_IN_FORMULA,
				(diceExpr) => {
					try {
						const res = roll(diceExpr);
						if (res?.total !== undefined) return String(res.total);
					} catch {}
					return diceExpr;
				}
			);
			// Strip {cs/cf:...} blocks
			const criticalBlocks: string[] = [];
			const cleanedInner = rolledInner.replace(
				REMOVER_PATTERN.CRITICAL_BLOCK,
				(block) => {
					const parsed = DETECT_CRITICAL_ALL.exec(block);
					if (parsed) {
						const [, prefix, operator, expr] = parsed;
						try {
							const evaled = replaceFormulaInDice(`{{${expr}}}`);
							criticalBlocks.push(`${prefix}${operator}${evaled}}`);
							return "";
						} catch {}
					}
					criticalBlocks.push(block);
					return "";
				}
			);
			if (criticalBlocks.length > 0) {
				try {
					const result = replaceFormulaInDice(`{{${cleanedInner}}}`);
					return `${result}${criticalBlocks.join("")}`;
				} catch {
					// Formula evaluation failed; return with cs/cf stripped so replaceFormulaInDice can still try.
					if (!cleanedInner.includes("$"))
						logger.info(`Failed to evaluate pre-rolled inner formula: ${cleanedInner}`);

					return `{{${cleanedInner}}}`;
				}
			}
			logger.info(`Pre-rolled inner formula: ${cleanedInner} → ${rolledInner}`);
			return `{{${rolledInner}}}`;
		}
	);
}

/** Detects a dice roll in a message and, if found, extracts, processes (stat substitution, chained/shared syntax), and executes it. */
export function isRolling(
	content: string,
	userData?: UserData,
	statsName?: string[],
	pity?: boolean,
	disableCompare?: boolean,
	sort?: SortOrder,
	ul?: Translation,
	replaceUnknown?: string
): DiceExtractionResult | undefined {
	let processedContent: string;

	// Evaluates {{...}} formula blocks before opposition/comment detection (so a comparator inside a formula
	// isn't mistaken for dice syntax), and pre-rolls dice notation inside {{...}} so the math evaluator doesn't choke on it.
	content = preRollDiceInBrackets(content);
	try {
		content = replaceFormulaInDice(content);
	} catch {
		// If formula evaluation fails, proceed with the original content unchanged.
	}

	// Preserved for processChainedDiceRoll, before further modification.
	const originalContent = content;
	const evaluated = DICE_COMPILED_PATTERNS.TARGET_VALUE.exec(content);
	if (!evaluated) {
		content = extractOpposition(content)?.dice ?? content;
		if (disableCompare) {
			//preserve comments
			const val = extractAndMergeComments(content);
			content = `{${val.cleanedDice}}`;
			if (val.mergedComments) content = `${content} ${val.mergedComments.trim()}`;
		}
	} else if (evaluated.groups) {
		const doubleTarget = DICE_COMPILED_PATTERNS.DOUBLE_TARGET.exec(content);
		const { dice, comments } = evaluated.groups;
		if (doubleTarget?.groups?.dice) content = dice.trim();
		else content = `{${dice.trim()}}`;

		if (comments) content = `${content} ${comments}`;
	}

	let res: {
		formula: string;
		infoRoll?: string | undefined;
		statsPerSegment?: string[];
	} = {
		formula: content,
		infoRoll: undefined,
		statsPerSegment: undefined,
	};
	if (userData?.stats) {
		const bracketMatch = content.match(DICE_PATTERNS.BRACKET_ROLL);
		const isDiceTarget = !!bracketMatch && /\b\d*d\d+\b/i.test(bracketMatch[1]);
		// Preserves comments in brackets; only stats/formula get substituted.
		const isStatTarget = !!bracketMatch && isFormulaExpression(bracketMatch[1]);
		if (bracketMatch?.index !== undefined && (isDiceTarget || isStatTarget)) {
			const inner = replaceStatsInDiceFormula(
				bracketMatch[1],
				userData.stats,
				undefined,
				undefined,
				statsName,
				ul,
				replaceUnknown
			);
			let replacement: string;
			if (isDiceTarget) {
				replacement = `[${inner.formula.trim()}]`;
			} else {
				const markerIndex = inner.formula.indexOf("%%[__");
				const value = (
					markerIndex === -1 ? inner.formula : inner.formula.slice(0, markerIndex)
				).trim();
				const trailing =
					markerIndex === -1 ? "" : ` ${inner.formula.slice(markerIndex).trim()}`;
				replacement = `(${value})${trailing}`;
			}
			res = {
				...inner,
				formula:
					content.slice(0, bracketMatch.index) +
					replacement +
					content.slice(bracketMatch.index + bracketMatch[0].length),
			};
		} else {
			res = replaceStatsInDiceFormula(
				content,
				userData.stats,
				undefined,
				undefined,
				statsName,
				ul,
				replaceUnknown
			);
		}
	}
	processedContent = res.formula;

	const diceData = extractDiceData(processedContent);

	if (diceData.bracketRoll) {
		const cleanedForRoll = processedContent.replace(REMOVER_PATTERN.CRITICAL_BLOCK, "");
		const diceRoll = performDiceRoll(
			cleanedForRoll,
			diceData.bracketRoll,
			res?.infoRoll,
			pity,
			sort
		);
		if (diceRoll?.resultat) {
			if (disableCompare) collapseCompareToCount(diceRoll.resultat);
			return {
				detectRoll: diceData.bracketRoll,
				infoRoll: diceRoll.infoRoll,
				result: diceRoll.resultat,
				statsPerSegment: res.statsPerSegment,
			};
		}
	}

	if (
		processedContent.includes("#") ||
		(processedContent.includes("&") && processedContent.includes(";"))
	) {
		const diceRoll = processChainedDiceRoll(
			originalContent.replace(REMOVER_PATTERN.CRITICAL_BLOCK, ""),
			userData,
			statsName,
			pity,
			disableCompare,
			sort,
			ul,
			replaceUnknown
		);
		if (diceRoll)
			return {
				detectRoll: undefined,
				infoRoll: diceRoll.infoRoll,
				result: diceRoll.resultat,
				statsPerSegment: diceRoll.statsPerSegment,
			};
	}
	if (hasValidDice(diceData)) {
		let { comments } = diceData;
		let finalContent = processedContent;

		if (comments) {
			const chained = processChainedComments(processedContent, comments);
			finalContent = chained.content;
			comments = chained.comments;
		}

		finalContent = finalContent.replace(REMOVER_PATTERN.CRITICAL_BLOCK, "");

		const diceRoll = performDiceRoll(finalContent, undefined, res.infoRoll, pity, sort);
		if (!diceRoll?.resultat?.result.length) return undefined;
		if (diceRoll) applyCommentsToResult(diceRoll.resultat, comments, undefined);
		if (disableCompare) collapseCompareToCount(diceRoll.resultat);
		return {
			detectRoll: undefined,
			result: diceRoll.resultat,
			statsPerSegment: res.statsPerSegment,
		};
	}

	return undefined;
}

/** Executes a shared roll (semicolon-separated) and attaches any top-level global comment. */
function getRollInShared(dice: string, pity?: boolean, sort?: SortOrder) {
	const { dice: cleanDice, comment } = splitGlobalComment(dice);
	const rollDice = roll(cleanDice, undefined, pity, sort, comment);
	if (!rollDice) return undefined;
	rollDice.dice = cleanDice;
	return rollDice;
}

/** True if a dice expression has multiple `;`-separated segments (after stripping inline comment markers). */
function isSharedRoll(dice: string): boolean {
	// Remove comment to avoid false positive on ";" in comment text
	const { dice: cleanedDice } = splitGlobalComment(dice);
	return maskBracketComments(cleanedDice).includes(";");
}

/** Gets a roll result for a dice expression, handling shared rolls and inline comments. */
export function getRoll(
	dice: string,
	pity?: boolean,
	sort?: SortOrder
): Resultat | undefined {
	dice = preRollDiceInBrackets(dice);
	if (isSharedRoll(dice)) return getRollInShared(dice, pity, sort);
	const { dice: cleanDice, comment } = splitDiceComment(dice);
	return roll(cleanDice, undefined, pity, sort, comment);
}

/** Fresh instance per use: `STAT_MATCHER` is global, and `matchAll` continues from its shared `lastIndex` —
 * a stale offset silently skips the formula's leading `$stat`, which then reaches the dice parser unresolved. */
const statMatcher = () => new RegExp(REMOVER_PATTERN.STAT_MATCHER.source, "giu");

/** Replaces stat variables like `$force`/`$dexterity` in dice formulas, excluding comments (partial matching:
 * `$sag` matches "sagesse"). For shared rolls (with `;`), also returns `statsPerSegment` per segment. */
export function replaceStatsInDiceFormula(
	content: string,
	stats?: Record<string, number>,
	deleteComments = false,
	shared = false,
	statsName?: string[],
	_ul?: Translation,
	replaceUnknow?: string
): { formula: string; infoRoll?: string; statsPerSegment?: string[] } {
	if (!stats) return { formula: verifyStatMatcherPattern(content, replaceUnknow) };
	let comments = bareComment(content);
	let diceFormula = content;
	const statsFounds: string[] = [];
	if (comments) diceFormula = diceFormula.replace(comments, "").trim() ?? "";
	else comments = "";

	const normalizedStats = normalizeStatsMap(stats);
	const isSharedRoll = diceFormula.includes(";");

	// For shared rolls, process each segment separately to track stats per segment
	let processedFormula = diceFormula;
	const statsPerSegment: string[] = [];

	if (isSharedRoll) {
		// Splits on ';' using lookahead/lookbehind so the delimiter survives as its own segment
		// (yields [segment1, ";", segment2, ...] once empty strings are filtered).
		const segments = diceFormula.split(/(?=;)|(?<=;)/).filter((s) => s.length > 0);
		const processedSegments: string[] = [];

		for (const segment of segments) {
			if (segment === ";") {
				processedSegments.push(segment);
				continue;
			}

			let processedSegment = segment;
			const segmentStats: string[] = [];

			const variableMatches = [...segment.matchAll(statMatcher())];

			for (const match of variableMatches) {
				const fullMatch = match[0];
				const searchTerm = match[1].standardize();

				if (!processedSegment.includes(fullMatch)) continue;

				const foundStat = findBestStatMatch<[string, number]>(
					searchTerm,
					normalizedStats,
					MIN_THRESHOLD_MATCH
				);

				if (foundStat) {
					const [original, statValue] = foundStat;
					const capitalizedStat = original.capitalize();
					segmentStats.push(capitalizedStat);
					statsFounds.push(capitalizedStat);
					// Preserve surrounding parentheses that the regex may have consumed (e.g. `($s1+$s2)`)
					const prefix = fullMatch.startsWith("(") ? "(" : "";
					const suffix = fullMatch.endsWith(")") ? ")" : "";
					processedSegment = processedSegment.replace(
						new RegExp(RegExp.escape(fullMatch), "gu"),
						`${prefix}${statValue}${suffix}`
					);
				}
			}

			processedSegments.push(processedSegment);

			// Track the stat for this segment (use first stat if multiple, or empty string)
			if (segment !== ";") {
				const uniqueSegmentStats = Array.from(new Set(segmentStats));
				let statForSegment = "";
				if (uniqueSegmentStats.length > 0) {
					statForSegment = statsName
						? unNormalizeStatsName(uniqueSegmentStats, statsName).join(" × ")
						: uniqueSegmentStats.map((s) => s.capitalize()).join(" × ");
				}
				statsPerSegment.push(statForSegment.capitalize());
			}
		}

		processedFormula = processedSegments.join("");
	} else {
		// Non-shared roll: process as before
		const variableMatches = [...processedFormula.matchAll(statMatcher())];
		if (!variableMatches.length)
			return { formula: verifyStatMatcherPattern(content, replaceUnknow) };

		for (const match of variableMatches) {
			const fullMatch = match[0];
			const searchTerm = match[1].standardize();

			if (!processedFormula.includes(fullMatch)) continue;

			const foundStat = findBestStatMatch<[string, number]>(
				searchTerm,
				normalizedStats,
				MIN_THRESHOLD_MATCH
			);

			if (foundStat) {
				const [original, statValue] = foundStat;
				statsFounds.push(original.capitalize());
				// Keep a dangling paren only when the regex consumed just one side: `($var)` (both sides)
				// drops them, but `($s1` or `$s2)` (one side) keeps it so `1d($s1+$s2)` → `1d(X+Y)`.
				const prefix = fullMatch.startsWith("(") && !fullMatch.endsWith(")") ? "(" : "";
				const suffix = fullMatch.endsWith(")") && !fullMatch.startsWith("(") ? ")" : "";
				processedFormula = processedFormula.replace(
					new RegExp(RegExp.escape(fullMatch), "gu"),
					`${prefix}${statValue}${suffix}`
				);
			}
		}
	}

	const uniqueStats = Array.from(new Set(statsFounds.filter((stat) => stat.length > 0)));
	let statsList: string | undefined;
	if (uniqueStats.length > 0) {
		statsList = statsName
			? unNormalizeStatsName(uniqueStats, statsName).join(" × ")
			: uniqueStats.join(" × ");
		comments = comments
			? ` %%[__${statsList}__]%% ${comments} `
			: ` %%[__${statsList}__]%% `;
		if (shared) comments = `#${comments}`;
	} else comments = comments ? ` ${comments} ` : "";

	// deleteComments = true : do not add the %%[__Stats__]%% marker, but preserve original comments
	if (deleteComments) {
		const originalComments = bareComment(content) || "";
		const finalFormula = originalComments
			? `${processedFormula} ${originalComments}`.trim()
			: processedFormula;
		return {
			formula: verifyStatMatcherPattern(finalFormula, replaceUnknow),
			infoRoll: statsList,
			statsPerSegment: isSharedRoll ? statsPerSegment : undefined,
		};
	}
	return {
		formula: `${verifyStatMatcherPattern(processedFormula, replaceUnknow)} ${comments}`,
		infoRoll: statsList,
		statsPerSegment: isSharedRoll ? statsPerSegment : undefined,
	};
}

export function unNormalizeStatsName(stats: string[], statsName: string[]): string[] {
	const unNormalized: string[] = [];
	const normalizedStats = normalizedMap(statsName);
	for (const stat of stats) {
		const standardized = stat.standardize();
		const exactMatch = normalizedStats.get(standardized);
		if (exactMatch) {
			unNormalized.push(exactMatch.capitalize());
		} else {
			const found = findBestStatMatch<string>(
				standardized,
				normalizedStats,
				MIN_THRESHOLD_MATCH
			);
			if (found) unNormalized.push(found.capitalize());
			else unNormalized.push(stat.capitalize());
		}
	}
	return unNormalized;
}

/** Builds an infoRoll object from found stats, restoring original accents using statsName. */
export function buildInfoRollFromStats(
	statsFound: string[] | undefined,
	statsName?: string[]
): { name: string; standardized: string } | undefined {
	if (!statsFound || statsFound.length === 0) return undefined;
	const uniqueFound = Array.from(new Set(statsFound));
	const names =
		statsName && statsName.length > 0
			? unNormalizeStatsName(uniqueFound, statsName)
			: uniqueFound.map((s) => s.capitalize());
	const name = names.join(" × ");
	return { name, standardized: name.standardize() };
}

/** Builds a lookup map from normalized stat names to [originalName, value] tuples (avoids rebuilding it inline). */
export function normalizeStatsMap(
	stats: Record<string, number>
): Map<string, [string, number]> {
	const map = new Map<string, [string, number]>();
	for (const [key, value] of Object.entries(stats)) {
		map.set(key.standardize(), [key, value]);
	}
	return map;
}

function normalizedMap(statsName: string[]): Map<string, string> {
	const normalizedStats = new Map<string, string>();
	for (const stat of statsName) {
		normalizedStats.set(stat.standardize(), stat);
	}
	return normalizedStats;
}

export function findStatInDiceFormula(
	diceFormula: string,
	statsToFind?: string[]
): string[] | undefined {
	if (!statsToFind) return undefined;
	const foundStats: string[] = [];
	const text = diceFormula.standardize();
	const tokens = text.match(/\p{L}[\p{L}0-9_.]*/gu) || [];

	const normalizedStats = normalizedMap(statsToFind);

	for (const token of tokens) {
		const match = findBestStatMatch<string>(token, normalizedStats, MIN_THRESHOLD_MATCH);
		if (match) foundStats.push(match.capitalize());
	}
	const unique = Array.from(new Set(foundStats));
	return unique.length > 0 ? unique : undefined;
}

/** True if a `[...]` bracket's content is a custom formula invocation rather than a comment: contains a `$`
 * stat reference, is a pure math expression, or is dice notation. */
function isFormulaExpression(expr: string): boolean {
	const trimmed = expr.trim();
	if (trimmed.includes("$")) return true;
	if (/^[\d\s+\-*/%.()^]+$/.test(trimmed)) return true;
	// Allow dice notation (e.g. "1d6", "2d10+3", "d20") mixed with standard math operators
	return /^[\d\s+\-*/%.()^d]+$/i.test(trimmed) && /\b\d*d\d+\b/i.test(trimmed);
}

/** A fresh instance per use: the shared pattern is global, so its `lastIndex` is stateful. */
const criticalBlocks = () => new RegExp(REMOVER_PATTERN.CRITICAL_BLOCK.source, "gi");

function isReachable(formula: string, index: number): boolean {
	let current = 0;
	const probe = formula.replace(criticalBlocks(), () =>
		current++ === index ? "*NaN" : ""
	);
	try {
		const value = evaluate(probe);
		return typeof value !== "number" || Number.isNaN(value);
	} catch {
		return true;
	}
}

function dropUnreachableCriticals(formula: string): string {
	let index = 0;
	return formula.replace(criticalBlocks(), (block) =>
		isReachable(formula, index++) ? block : ""
	);
}

/** Replaces `[expr]` markers with the custom formula (injecting `(expr)`), dropping unreached `{cs:…}`/`{cf:…}`
 * blocks; `[expr]` only counts as a formula when it contains `$`, math, or dice notation. */
export function applyCustomFormula(dice: string, formula: string): string {
	return dice.replace(/\[([^\]]+)\]/g, (match, expr: string) => {
		if (!isFormulaExpression(expr)) return match;
		const injected = formula.replaceAll("$", `(${expr.trim()})`);
		return `{{${dropUnreachableCriticals(injected)}}}`;
	});
}

export function applySemiDirectCustomFormula(content: string, formula: string): string {
	const bracketMatch = content.match(DICE_PATTERNS.BRACKET_ROLL);
	if (bracketMatch?.index === undefined) return applyCustomFormula(content, formula);
	const isDiceTarget = /\b\d*d\d+\b/i.test(bracketMatch[1]);
	const transformed = isDiceTarget
		? `[${applyCustomFormula(bracketMatch[1], formula)}]`
		: applyCustomFormula(bracketMatch[0], formula);
	return (
		content.slice(0, bracketMatch.index) +
		transformed +
		content.slice(bracketMatch.index + bracketMatch[0].length)
	);
}
