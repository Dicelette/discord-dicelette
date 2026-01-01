/** biome-ignore-all lint/style/useNamingConvention: variable */
import { type Resultat, roll, SIGN_REGEX, type SortOrder } from "@dicelette/core";
import type {
	ChainedComments,
	DiceData,
	DiceExtractionResult,
	UserData,
} from "@dicelette/types";
import {
	DICE_COMPILED_PATTERNS,
	DICE_PATTERNS,
	findBestStatMatch,
	getCachedRegex,
	logger, NORMALIZE_SINGLE_DICE,
	REMOVER_PATTERN,
} from "@dicelette/utils";
import { extractAndMergeComments, getComments } from "./comment_utils";
import { trimAll } from "./utils";

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

		// Nettoyage des marqueurs/commentaires avant le parseur de dés
		rollContent = rollContent
			.replace(/%%\[__.*?__]%%/g, "")
			.replace(DICE_PATTERNS.GLOBAL_COMMENTS, "")
			.replace(/%{4,}/g, "")
			.replace(/\s*%%+\s*/g, " ")
			.replace(/ @\w+/, "")
			.trimEnd();
		if (/`.*`/.test(rollContent) || /^[\\/]/.test(rollContent)) return undefined;
		return { infoRoll, resultat: roll(rollContent, undefined, pity, sort) };
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
 * @param disableCompare
 * @param sortOrder
 * @returns An object with `resultat` (the roll result), optional `infoRoll` (primary stat used for the roll), and optional `statsPerSegment` (per-segment stat names) when the roll succeeds, or `undefined` if the roll could not be performed
 */
export function processChainedDiceRoll(
	content: string,
	userData?: UserData,
	statsName?: string[],
	pity?: boolean,
	disableCompare?: boolean,
	sortOrder?: SortOrder
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
			statsName
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
		const rollResult = roll(cleaned, undefined, pity, sortOrder);
		if (!rollResult) return undefined;
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
 * Determine whether a message contains a dice roll and, if so, extract, process (including stat substitution and chained/shared syntax), and execute the roll.
 *
 * @param content - The raw message or formula to analyze for dice expressions
 * @param userData - Optional user data containing stats used to substitute stat tokens in formulas
 * @param statsName - Optional list of original stat names used to preserve original casing in info roll metadata
 * @param pity - Optional flag passed to the underlying roll implementation to modify roll behavior
 * @param disableCompare - If true, encapsulate the roll in `{}` to disable success/failure comparison
 * @param sortOrder - Optional sort order for the roll results
 * @returns `DiceExtractionResult` when a valid roll is detected and executed, `undefined` otherwise
 */
export function isRolling(
	content: string,
	userData?: UserData,
	statsName?: string[],
	pity?: boolean,
	disableCompare?: boolean,
	sortOrder?: SortOrder
): DiceExtractionResult | undefined {
	// Process stats replacement if userData is available
	let processedContent: string;

	// Preserve original content before any modifications for processChainedDiceRoll
	const originalContent = content;
	const evaluated = DICE_COMPILED_PATTERNS.TARGET_VALUE.exec(content);
	if (!evaluated) {
		// Preclean to ignore {cs|cf:...} blocs
		const contentForOpposition = content.replace(REMOVER_PATTERN.CRITICAL_BLOCK, "");
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
			//logger.trace("Content after opposition removal:", content);
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
		//logger.trace("Double target", doubleTarget);
		const { dice, comments } = evaluated.groups;
		if (doubleTarget?.groups?.dice) {
			content = dice.trim();
		} else {
			//also find the comments and preserve them
			//dice is group 1
			//comments can be group 2
			content = `{${dice.trim()}}`;
		}
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
			statsName
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
			sortOrder
		);
		if (diceRoll?.resultat)
			return {
				detectRoll: diceData.bracketRoll,
				infoRoll: diceRoll.infoRoll,
				result: diceRoll.resultat,
				statsPerSegment: res.statsPerSegment,
			};
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
			sortOrder
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

		const diceRoll = performDiceRoll(
			finalContent,
			undefined,
			res.infoRoll,
			pity,
			sortOrder
		);
		if (!diceRoll?.resultat || !diceRoll.resultat.result.length) return undefined;
		if (diceRoll) applyCommentsToResult(diceRoll.resultat, comments, undefined);
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
	const main = DICE_PATTERNS.GLOBAL_COMMENTS_GROUP.exec(dice)?.groups?.comment;
	dice = dice.replace(DICE_PATTERNS.GLOBAL_COMMENTS_GROUP, "");
	const rollDice = roll(dice, undefined, pity, sort);
	if (!rollDice) return undefined;

	rollDice.dice = dice;
	if (main) rollDice.comment = main;
	return rollDice;
}

/**
 * Detects whether a dice expression represents a shared roll (multiple segments separated by semicolons) after stripping inline comment markers.
 *
 * @param dice - The dice expression to inspect
 * @returns `true` if the cleaned expression contains a semicolon, `false` otherwise
 */
function isSharedRoll(dice: string): boolean {
	//we need to remove the comments to avoid false positive
	const cleanedDice = dice.replace(DICE_PATTERNS.DETECT_DICE_MESSAGE, "$1").trim();
	return cleanedDice.includes(";");
}

/**
 * Obtain a roll result for a dice expression, handling shared rolls and inline comments.
 *
 * @param dice - Dice expression to evaluate; may contain inline comment markers or shared-segment syntax.
 * @param pity - Optional flag forwarded to the rolling engine that alters roll behavior.
 * @param sort
 * @returns The computed Resultat with embedded comment and adjusted dice string when present, or `undefined` if the expression is invalid or rolling failed.
 */
export function getRoll(
	dice: string,
	pity?: boolean,
	sort?: SortOrder
): Resultat | undefined {
	logger.trace("Getting roll for dice:", dice);
	if (isSharedRoll(dice)) return getRollInShared(dice, pity, sort);
	const comments = dice
		.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3]
		.replaceAll("*", "\\*");
	if (comments) dice = dice.replace(DICE_PATTERNS.DETECT_DICE_MESSAGE, "$1");

	dice = dice.trim();
	try {
		const rollDice = roll(dice, undefined, pity, sort);
		if (!rollDice) return undefined;
		if (comments) {
			rollDice.comment = comments;
			rollDice.dice = `${dice} /* ${comments} */`;
		}
		return rollDice;
	} catch (error) {
		logger.warn(error);
		return undefined;
	}
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
	statsName?: string[]
): { formula: string; infoRoll?: string; statsPerSegment?: string[] } {
	if (!stats) return { formula: content };
	//remove secondary opposition

	let comments = content.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3];
	let diceFormula = content;
	const statsFounds: string[] = [];
	if (comments) diceFormula = diceFormula.replace(comments, "").trim() ?? "";
	else comments = "";

	// Pre-process stats for better performance
	const normalizedStats = new Map<string, [string, number]>();
	for (const [key, value] of Object.entries(stats)) {
		const normalized = key.standardize();
		normalizedStats.set(normalized, [key, value]);
	}

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
					normalizedStats
				);

				if (foundStat) {
					const [original, statValue] = foundStat;
					const capitalizedStat = original.capitalize();
					segmentStats.push(capitalizedStat);
					statsFounds.push(capitalizedStat);
					// Escape all regex special characters in the fullMatch (including parentheses)
					const escapedMatch = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
					const regex = getCachedRegex(`${escapedMatch}`, "gu");
					processedSegment = processedSegment.replace(regex, statValue.toString());
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
						? unNormalizeStatsName(uniqueSegmentStats, statsName)[0]
						: uniqueSegmentStats[0];
				}
				statsPerSegment.push(statForSegment);
			}
		}

		processedFormula = processedSegments.join("");
	} else {
		// Non-shared roll: process as before
		const variableMatches = [...processedFormula.matchAll(REMOVER_PATTERN.STAT_MATCHER)];
		if (!variableMatches.length) return { formula: content };

		for (const match of variableMatches) {
			const fullMatch = match[0];
			const searchTerm = match[1].standardize();

			if (!processedFormula.includes(fullMatch)) continue;

			const foundStat = findBestStatMatch<[string, number]>(searchTerm, normalizedStats);

			if (foundStat) {
				const [original, statValue] = foundStat;
				statsFounds.push(original.capitalize());
				// Escape all regex special characters in the fullMatch (including parentheses)
				const escapedMatch = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				const regex = getCachedRegex(`${escapedMatch}`, "gu");
				processedFormula = processedFormula.replace(regex, statValue.toString());
			}
		}
	}

	const uniqueStats = Array.from(new Set(statsFounds.filter((stat) => stat.length > 0)));
	if (uniqueStats.length > 0) {
		const statsList = statsName
			? unNormalizeStatsName(uniqueStats, statsName).join(", ")
			: uniqueStats.join(", ");
		comments = comments
			? ` %%[__${statsList}__]%% ${comments} `
			: ` %%[__${statsList}__]%% `;
		if (shared) comments = `#${comments}`;
	} else comments = comments ? ` ${comments} ` : "";

	// deleteComments = true : ne pas ajouter le marqueur %%[__Stats__]%%, mais préserver les commentaires originaux
	if (deleteComments) {
		const originalComments = content.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3] || "";
		const finalFormula = originalComments
			? `${processedFormula} ${originalComments}`.trim()
			: processedFormula;
		return {
			formula: finalFormula,
			infoRoll: uniqueStats?.[0],
			statsPerSegment: isSharedRoll ? statsPerSegment : undefined,
		};
	}
	return {
		formula: `${processedFormula} ${comments}`,
		infoRoll: uniqueStats?.[0],
		statsPerSegment: isSharedRoll ? statsPerSegment : undefined,
	};
}

export function unNormalizeStatsName(stats: string[], statsName: string[]): string[] {
	const unNormalized: string[] = [];
	const normalizedStats = normalizedMap(statsName);
	for (const stat of stats) {
		const found = findBestStatMatch<string>(stat.standardize(), normalizedStats);
		if (found) unNormalized.push(found);
		else unNormalized.push(stat);
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
			: uniqueFound;
	const name = names.join(" ");
	return { name, standardized: name.standardize() };
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

	// Normaliser la formule et préparer les tokens (mots) à analyser
	const text = diceFormula.standardize();
	const tokens = text.match(/\p{L}[\p{L}0-9_]*/gu) || [];

	// Préparer la map des stats normalisées -> original
	const normalizedStats = normalizedMap(statsToFind);

	for (const token of tokens) {
		const match = findBestStatMatch<string>(token, normalizedStats);
		if (match) foundStats.push(match.capitalize());
	}

	// garder l'ordre unique
	const unique = Array.from(new Set(foundStats));
	return unique.length > 0 ? unique : undefined;
}

export function includeDiceType(dice: string, diceType?: string, userStats?: boolean) {
	if (!diceType) return false;
	// Normalize leading implicit single dice: treat `1d100` and `d100` as equivalent
	diceType = NORMALIZE_SINGLE_DICE(diceType);
	dice = NORMALIZE_SINGLE_DICE(dice);
	if (userStats && diceType.includes("$")) {
		//replace the $ in the diceType by a regex (like .+?)
		diceType = diceType.replace("$", ".+?");
	}
	if (SIGN_REGEX.test(diceType)) {
		//remove it from the diceType and the value after it like >=10 or <= 5 to prevent errors
		diceType = diceType.replace(REMOVER_PATTERN.SIGN_REMOVER, "").trim();
		dice = dice.replace(REMOVER_PATTERN.SIGN_REMOVER, "").trim();
	}
	//also prevent error with the {exp} value
	if (diceType.includes("{exp")) {
		diceType = diceType.replace(REMOVER_PATTERN.EXP_REMOVER, "").trim();
		dice = dice.replace(REMOVER_PATTERN.EXP_REMOVER, "").trim();
	}
	const detectDiceType = getCachedRegex(`\\b${diceType}\\b`, "i");
	return detectDiceType.test(dice);
}
