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
import { DICE_COMPILED_PATTERNS, DICE_PATTERNS, logger } from "@dicelette/utils";
import { extractAndMergeComments, getComments } from "./comment_utils";
import { trimAll } from "./utils";

/**
 * Matches a `{{...}}` formula block (allowing single `}` inside).
 * Used to neutralize formula blocks before opposition detection so that
 * comparison operators inside them (e.g. `{{$>=85?85:$}}`) are not mistaken
 * for an opposition comparator when the block still contains an unresolved
 * `$stat` and therefore could not be pre-evaluated.
 */
const FORMULA_BLOCK_PATTERN = /\{\{(?:[^}]|\}(?!\}))*\}\}/g;

export function extractDiceData(content: string): DiceData {
	//exclude if the content is between codeblocks

	const bracketRoll = content
		.replace(/%%.*%%/, "")
		.match(DICE_PATTERNS.BRACKET_ROLL)?.[1];
	const comments = content
		.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3]
		?.replaceAll("*", "\\*");
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

	const finalContent = content
		.replace(DICE_PATTERNS.DETECT_DICE_MESSAGE, "$1")
		.replace(/%%.*%%/, "")
		.trimEnd();

	return {
		comments: getComments(content, comments),
		content: finalContent,
	};
}

/**
 * Execute a cleaned dice roll from given content or an explicit bracketed roll and return the roll result.
 *
 * @param content - Original message content containing a dice expression and optional comment markers
 * @param bracketRoll - Optional explicit bracketed dice expression to prioritize over `content`
 * @param infoRoll - Optional metadata about the roll (e.g., resolved stat name) to include in the result
 * @param pity - Optional flag passed to the underlying roll engine to alter roll behavior
 * @param sort
 * @returns An object with `resultat` containing the roll result (if the roll ran) and optional `infoRoll`, or `undefined` when the content is invalid or an error occurred
 */
export function performDiceRoll(
	content: string,
	bracketRoll: string | undefined,
	infoRoll?: string,
	pity?: boolean,
	sort?: SortOrder
): { resultat: Resultat | undefined; infoRoll?: string } | undefined {
	try {
		let rollContent = bracketRoll ? trimAll(bracketRoll) : trimAll(content);

		// Clean markers before the dice parser
		rollContent = rollContent
			.replace(/%%\[__.*?__]%%/g, "")
			.replace(/%{4,}/g, "")
			.replace(/\s*%%+\s*/g, " ")
			.replace(/ @\w+/, "")
			.trimEnd();
		if (/`.*`/.test(rollContent) || /^[\\/]/.test(rollContent)) return undefined;
		// Extract and pass the comment separately so roll() receives a clean dice string
		const { dice: cleanDice, comment } = splitDiceComment(rollContent);
		return { infoRoll, resultat: roll(cleanDice, undefined, pity, sort, comment) };
	} catch (e) {
		logger.warn(e);
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

/**
 * Process a chained dice expression (supports shared segments and stat substitutions) and execute the resulting roll.
 *
 * Replaces stat tokens using the provided user stats, cleans global comments and opposition clauses, executes the roll (honoring the optional `pity` flag), and attaches comment/info metadata when appropriate.
 *
 * @param content - The raw dice expression to process (may include chained segments, global comments, opposition, and stat tokens)
 * @param userData - Optional user data containing `stats` to substitute into the formula
 * @param statsName - Optional list of original stat names used to preserve casing when building `infoRoll` and `statsPerSegment`
 * @param pity - Optional flag passed to the underlying roll implementation to modify roll behavior
 * @param disableCompare - Encapsulate the roll with `{}`
 * @param sort - Sort the result passed to roll
 * @param ul
 * @param replaceUnknown
 * @returns An object with `resultat` (the roll result), optional `infoRoll` (primary stat used for the roll), and optional `statsPerSegment` (per-segment stat names) when the roll succeeds, or `undefined` if the roll could not be performed
 */
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

/**
 * Collapse a compared roll into a 0/1 success count for `disableCompare`.
 *
 * A pure `XdY>Z` pool already rolls as a success count, but core cannot pool an
 * expression with a modifier (e.g. `1d20+5>=20`), so the result still carries a
 * `compare` and the formatter would show a success/failure verdict. To keep the
 * behaviour consistent, replace the total with the 0/1 count, re-inject the
 * comparator into the dice label (so the threshold stays visible) and drop the
 * comparison. Shared rolls are left untouched.
 */
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
	// Mirror pool behaviour: mark each die that individually passes the threshold.
	// The total may pass via a modifier even when no individual die does, so we
	// compare die values rather than `count`.
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
	// Process stats replacement if userData is available
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

	// Evaluate {{...}} formula blocks before opposition detection so that comparison
	// operators inside the formula (e.g. {{($>=0?$:0)}}) are not mistaken for a
	// second opposition comparator.
	finalContent = preRollDiceInBrackets(finalContent);
	finalContent = replaceFormulaInDice(finalContent);

	// Remove opposition before rolling (but keep original content for comments)
	const contentForOpposition = finalContent.replace(REMOVER_PATTERN.CRITICAL_BLOCK, "");
	const oppositionMatch = /(?<first>([><=!]+)(.+?))(?<second>([><=!]+)(.+))/.exec(
		contentForOpposition
	);

	if (oppositionMatch?.groups) {
		// Remove the second comparator (opposition) only for the roll
		finalContent = finalContent.replace(oppositionMatch.groups.second, "").trim();
	}

	try {
		// Remove critical blocks before rolling
		let cleaned = finalContent.replace(REMOVER_PATTERN.CRITICAL_BLOCK, "");
		if (disableCompare) cleaned = `{${cleaned}}`;
		const rollResult = roll(cleaned, undefined, pity, sort);
		if (!rollResult) return undefined;
		if (disableCompare) collapseCompareToCount(rollResult);
		rollResult.dice = cleaned;
		// For chained rolls with & and ;, only add comment if it's a true # comment
		// (not the bracketed formula parts)
		const isChainedRoll = content.includes("&") && content.includes(";");
		const hasHashComment = content.includes("#");
		if (globalComments && (!isChainedRoll || hasHashComment))
			rollResult.comment = globalComments;
		return { infoRoll, resultat: rollResult, statsPerSegment };
	} catch (e) {
		logger.warn(e);
		return undefined;
	}
}

/**
 * Pre-rolls any dice notation found inside `{{...}}` formula blocks so that
 * `replaceFormulaInDice` (which uses a pure math evaluator) can evaluate the
 * remaining expression without stumbling on unknown dice symbols like `d6`.
 *
 * Also strips any `{cs:...}` / `{cf:...}` blocks from the inner formula before
 * math evaluation (they are not valid mathjs syntax), evaluates the numeric
 * expression inside each block, then reattaches the simplified blocks to the
 * numeric result.
 *
 * For example `{{(90)>=85?69{cs:<=5+((90)-85)}:(90)}}` becomes `69{cs:<=10}`.
 */
function preRollDiceInBrackets(content: string): string {
	if (!content.includes("{{")) return content;
	return content.replace(/\{\{((?:[^}]|\}(?!\}))*)\}\}/g, (_match, inner: string) => {
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
		// Strip {cs/cf:...} blocks so the math evaluator can handle the remaining
		// expression; evaluate their numeric sub-expressions and save them for later.
		const criticalBlocks: string[] = [];
		const cleanedInner = rolledInner.replace(REMOVER_PATTERN.CRITICAL_BLOCK, (block) => {
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
		});
		if (criticalBlocks.length > 0) {
			try {
				const result = replaceFormulaInDice(`{{${cleanedInner}}}`);
				return `${result}${criticalBlocks.join("")}`;
			} catch {
				// Formula evaluation failed; return with cs/cf stripped so
				// replaceFormulaInDice can still try to evaluate the formula.
				if (!cleanedInner.includes("$"))
					logger.info(`Failed to evaluate pre-rolled inner formula: ${cleanedInner}`);

				return `{{${cleanedInner}}}`;
			}
		}
		logger.info(`Pre-rolled inner formula: ${cleanedInner} → ${rolledInner}`);
		return `{{${rolledInner}}}`;
	});
}

/**
 * Determine whether a message contains a dice roll and, if so, extract, process (including stat substitution and chained/shared syntax), and execute the roll.
 *
 * @param content - The raw message or formula to analyze for dice expressions
 * @param userData - Optional user data containing stats used to substitute stat tokens in formulas
 * @param statsName - Optional list of original stat names used to preserve original casing in info roll metadata
 * @param pity - Optional flag passed to the underlying roll implementation to modify roll behavior
 * @param disableCompare - If true, encapsulate the roll in `{}` to disable success/failure comparison
 * @param sort - Optional sort order for the roll results
 * @param ul
 * @param replaceUnknown
 * @returns `DiceExtractionResult` when a valid roll is detected and executed, `undefined` otherwise
 */
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
	// Process stats replacement if userData is available
	let processedContent: string;

	// Evaluate {{...}} formula blocks before any opposition/comment detection so that
	// comparison operators inside the formula (e.g. {{$>=85?85:$}}) are not mistaken
	// for dice opposition syntax or comment markers.
	// Pre-roll dice inside {{...}} so the math evaluator doesn't choke on dice notation.
	content = preRollDiceInBrackets(content);
	try {
		content = replaceFormulaInDice(content);
	} catch {
		// If formula evaluation fails, proceed with the original content unchanged.
	}

	// Preserve original content before any modifications for processChainedDiceRoll
	const originalContent = content;
	const evaluated = DICE_COMPILED_PATTERNS.TARGET_VALUE.exec(content);
	if (!evaluated) {
		// Preclean to ignore {cs|cf:...} blocs and neutralize {{...}} formula blocks
		// (a still-unresolved `$stat` prevents their pre-evaluation, so a comparison
		// operator inside them must not be detected as a second/opposition comparator).
		const contentForOpposition = content
			.replace(REMOVER_PATTERN.CRITICAL_BLOCK, "")
			.replace(FORMULA_BLOCK_PATTERN, "0");
		const reg = DICE_COMPILED_PATTERNS.OPPOSITION.exec(contentForOpposition);

		// Extract comments before removing opposition part
		let preservedComments: string | undefined;
		if (reg?.groups) {
			// Extract any comments from the content before removing the opposition
			// Use DETECT_DICE_MESSAGE which captures comments without the leading "#"
			const commentMatch = content.match(DICE_PATTERNS.DETECT_DICE_MESSAGE);
			if (commentMatch?.[3]) preservedComments = commentMatch[3];

			// Also check for # comments using GLOBAL_COMMENTS which captures the content after #
			if (!preservedComments) {
				const hashComment = content.match(DICE_PATTERNS.GLOBAL_COMMENTS);
				if (hashComment?.[1]) preservedComments = hashComment[1];
			}

			content = content.replace(reg.groups.second, "").trim();

			if (disableCompare) content = `{${content}}`;
			// Re-append the comment if it was lost during opposition removal
			if (preservedComments && !content.includes(preservedComments)) {
				// Add back the comment as an inline comment (without #)
				// The processing pipeline will handle it correctly
				content = `${content} ${preservedComments}`;
			}
		} else if (disableCompare) {
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
	if (userData?.stats)
		res = replaceStatsInDiceFormula(
			content,
			userData.stats,
			undefined,
			undefined,
			statsName,
			ul,
			replaceUnknown
		);
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

/**
 * Execute a shared roll expression (semicolon-separated) and attach any top-level global comment.
 *
 * @param dice - The shared dice expression, possibly containing a global comment group and multiple segments separated by `;`.
 * @param pity - If `true`, enable pity mode for the underlying roll which may alter roll behavior.
 * @param sort
 * @returns The roll result with `dice` set to the cleaned expression and `comment` set to the extracted main comment, or `undefined` if the roll failed.
 */
function getRollInShared(dice: string, pity?: boolean, sort?: SortOrder) {
	const { dice: cleanDice, comment } = splitDiceComment(dice);
	const rollDice = roll(cleanDice, undefined, pity, sort, comment);
	if (!rollDice) return undefined;
	rollDice.dice = cleanDice;
	return rollDice;
}

/**
 * Detects whether a dice expression represents a shared roll (multiple segments separated by semicolons) after stripping inline comment markers.
 *
 * @param dice - The dice expression to inspect
 * @returns `true` if the cleaned expression contains a semicolon, `false` otherwise
 */
function isSharedRoll(dice: string): boolean {
	// Remove comment to avoid false positive on ";" in comment text
	const { dice: cleanedDice } = splitDiceComment(dice);
	return cleanedDice.includes(";");
}

/**
 * Obtain a roll result for a dice expression, handling shared rolls and inline comments.
 *
 * @param dice - Dice expression to evaluate; may contain inline comment markers or shared-segment syntax.
 * @param pity - Optional flag forwarded to the rolling engine that alters roll behavior.
 * @param sort
 * @returns The computed Resultat with the comment set and adjusted dice string, or `undefined` if the expression is invalid or rolling failed.
 */
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

/**
 * Replaces stat variables like $force, $dexterity in dice formulas (excluding comments)
 * Supports partial matching: $sag will match "sagesse", $dex will match "dexterite"
 * For shared rolls (with ;), returns statsPerSegment to track which stat applies to each segment
 */
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
	//remove secondary opposition

	let comments = content.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3];
	let diceFormula = content;
	const statsFounds: string[] = [];
	if (comments) diceFormula = diceFormula.replace(comments, "").trim() ?? "";
	else comments = "";

	// Pre-process stats for better performance
	const normalizedStats = normalizeStatsMap(stats);

	// Check if this is a shared roll (contains ;)
	const isSharedRoll = diceFormula.includes(";");

	// For shared rolls, process each segment separately to track stats per segment
	let processedFormula = diceFormula;
	const statsPerSegment: string[] = [];

	if (isSharedRoll) {
		// Split by ; using lookahead/lookbehind to preserve the delimiter
		// (?=;) matches position before ;, (?<=;) matches position after ;
		// This results in [segment1, ";", segment2, ";", ...] after filtering empty strings
		const segments = diceFormula.split(/(?=;)|(?<=;)/).filter((s) => s.length > 0);
		const processedSegments: string[] = [];

		for (const segment of segments) {
			if (segment === ";") {
				processedSegments.push(segment);
				continue;
			}

			let processedSegment = segment;
			const segmentStats: string[] = [];

			const variableMatches = [...segment.matchAll(REMOVER_PATTERN.STAT_MATCHER)];

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
						new RegExp(fullMatch.escapeRegex(), "gu"),
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
					// If statsName is provided, try to restore original casing
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
		const variableMatches = [...processedFormula.matchAll(REMOVER_PATTERN.STAT_MATCHER)];
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
				// Preserve a dangling paren only when the regex consumed it on one side only.
				// `($var)` → both parens consumed → drop them (just the value).
				// `($s1` or `$s2)` → one paren consumed → keep it so `1d($s1+$s2)` → `1d(X+Y)`.
				const prefix = fullMatch.startsWith("(") && !fullMatch.endsWith(")") ? "(" : "";
				const suffix = fullMatch.endsWith(")") && !fullMatch.startsWith("(") ? ")" : "";
				processedFormula = processedFormula.replace(
					new RegExp(fullMatch.escapeRegex(), "gu"),
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
		const originalComments = content.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3] || "";
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
		// First, try exact match
		const exactMatch = normalizedStats.get(standardized);
		if (exactMatch) {
			unNormalized.push(exactMatch.capitalize());
		} else {
			// If no exact match, try fuzzy match
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

/**
 * Build an infoRoll object from found stats, restoring original accents using statsName list.
 */
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

/**
 * Builds a lookup map from normalized stat names to [originalName, value] tuples.
 * Used by replaceStatsInDiceFormula and graph utilities to avoid rebuilding the map inline.
 */
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

	// Prepare the map of normalized stats -> original
	const normalizedStats = normalizedMap(statsToFind);

	for (const token of tokens) {
		const match = findBestStatMatch<string>(token, normalizedStats, MIN_THRESHOLD_MATCH);
		if (match) foundStats.push(match.capitalize());
	}
	const unique = Array.from(new Set(foundStats));
	return unique.length > 0 ? unique : undefined;
}

/**
 * Returns true if the content of a [...] bracket should be treated as a custom formula
 * invocation rather than an inline comment.
 * Rule: contains a `$` stat reference, or is a pure math expression (digits + operators).
 */
function isFormulaExpression(expr: string): boolean {
	const trimmed = expr.trim();
	if (trimmed.includes("$")) return true;
	if (/^[\d\s+\-*/%.()^]+$/.test(trimmed)) return true;
	// Allow dice notation (e.g. "1d6", "2d10+3", "d20") mixed with standard math operators
	return /^[\d\s+\-*/%.()^d]+$/i.test(trimmed) && /\b\d*d\d+\b/i.test(trimmed);
}

/**
 * Replaces `[expr]` markers in a dice string with the custom formula, injecting `(expr)`
 * in place of every `$` placeholder and wrapping the result in `{{...}}` for mathjs evaluation.
 *
 * `[expr]` is only treated as a formula invocation when the expression contains `$` or
 * consists solely of math characters — leaving plain text comments untouched.
 *
 * @example
 * // formula = "$>=85?85{cs:>=5+($-85)}:$"
 * applyCustomFormula("1d100<=[90]", formula)
 * // → "1d100<={{(90)>=85?85{cs:>=5+((90)-85)}:(90)}}"
 *
 * applyCustomFormula("1d100<=[$dex+$str]", formula)
 * // → "1d100<={{($dex+$str)>=85?85{cs:>=5+(($dex+$str)-85)}:($dex+$str)}}"
 *
 * applyCustomFormula("1d20 [attack roll]", formula)
 * // → "1d20 [attack roll]"  (comment left intact)
 */
export function applyCustomFormula(dice: string, formula: string): string {
	return dice.replace(/\[([^\]]+)\]/g, (match, expr: string) => {
		if (!isFormulaExpression(expr)) return match;
		const injected = formula.replaceAll("$", `(${expr.trim()})`);
		return `{{${injected}}}`;
	});
}
