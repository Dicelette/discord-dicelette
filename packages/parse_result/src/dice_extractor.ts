/** biome-ignore-all lint/style/useNamingConvention: variable */
import { type Resultat, roll, SIGN_REGEX } from "@dicelette/core";
import type {
	ChainedComments,
	DiceData,
	DiceExtractionResult,
	UserData,
} from "@dicelette/types";
import {
	DICE_PATTERNS,
	findBestStatMatch,
	getCachedRegex,
	logger,
	REMOVER_PATTERN,
} from "@dicelette/utils";
import { trimAll } from "./utils";

export function extractDiceData(content: string): DiceData {
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

export function getComments(content: string, comments?: string) {
	let globalComments = content.match(DICE_PATTERNS.GLOBAL_COMMENTS)?.[1];
	if (!globalComments && !comments)
		globalComments = content.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3];
	if (comments && !globalComments) globalComments = comments;

	const statValue = content.match(DICE_PATTERNS.INFO_STATS_COMMENTS);
	if (statValue)
		globalComments =
			statValue[0] +
			(globalComments
				? ` ${globalComments.replace(DICE_PATTERNS.INFO_STATS_COMMENTS, "").trim()}`
				: "");

	return globalComments;
}

export function processChainedComments(
	content: string,
	comments: string
): ChainedComments {
	if (
		comments.match(DICE_PATTERNS.BRACKETED_COMMENTS) &&
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

export function performDiceRoll(
	content: string,
	bracketRoll: string | undefined,
	userData?: UserData,
	statsName?: string[]
): { resultat: Resultat | undefined; infoRoll?: string } | undefined {
	try {
		let rollContent = bracketRoll ? trimAll(bracketRoll) : trimAll(content);
		let infoRoll: string | undefined;
		if (userData?.stats) {
			const res = replaceStatsInDiceFormula(
				rollContent,
				userData.stats,
				true,
				undefined,
				statsName
			);
			rollContent = res.formula;
			infoRoll = res.infoRoll;
		}
		rollContent = rollContent.replace(/ @\w+/, "").trimEnd();
		return { infoRoll, resultat: roll(rollContent) };
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

export function processChainedDiceRoll(
	content: string,
	userData?: UserData,
	statsName?: string[]
): { resultat: Resultat; infoRoll?: string } | undefined {
	// Process stats replacement if userData is available
	let processedContent = content;
	let infoRoll: string | undefined;
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
	}

	const globalComments = getComments(content);

	const finalContent = processedContent
		.replace(DICE_PATTERNS.GLOBAL_COMMENTS, "")
		.trim()
		.replace(/%%.*%%/, "")
		.trim();

	try {
		// Remove critical blocks before rolling
		const cleaned = finalContent.replace(REMOVER_PATTERN.CRITICAL_BLOCK, "");
		const rollResult = roll(cleaned);
		if (!rollResult) return undefined;
		rollResult.dice = cleaned;
		// For chained rolls with & and ;, only add comment if it's a true # comment
		// (not the bracketed formula parts)
		const isChainedRoll = content.includes("&") && content.includes(";");
		const hasHashComment = content.includes("#");
		if (globalComments && (!isChainedRoll || hasHashComment))
			rollResult.comment = globalComments;
		return { infoRoll, resultat: rollResult };
	} catch (e) {
		logger.warn(e);
		return undefined;
	}
}

export function isRolling(
	content: string,
	userData?: UserData,
	statsName?: string[]
): DiceExtractionResult | undefined {
	// Process stats replacement if userData is available
	let processedContent: string;
	// Preclean to ignore {cs|cf:...} blocs
	const contentForOpposition = content.replace(REMOVER_PATTERN.CRITICAL_BLOCK, "");
	const reg = /(?<first>([><=!]+)(.+?))(?<second>([><=!]+)(.+))/.exec(
		contentForOpposition
	);
	if (reg?.groups) content = content.replace(reg.groups.second, "").trim();

	let res = { formula: content };
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
			userData,
			statsName
		);
		if (diceRoll?.resultat)
			return {
				detectRoll: diceData.bracketRoll,
				infoRoll: diceRoll.infoRoll,
				result: diceRoll.resultat,
			};
	}

	if (
		processedContent.includes("#") ||
		(processedContent.includes("&") && processedContent.includes(";"))
	) {
		const diceRoll = processChainedDiceRoll(
			processedContent.replace(REMOVER_PATTERN.CRITICAL_BLOCK, ""),
			userData,
			statsName
		);
		if (diceRoll)
			return {
				detectRoll: undefined,
				infoRoll: diceRoll.infoRoll,
				result: diceRoll.resultat,
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

		const diceRoll = performDiceRoll(finalContent, undefined, userData, statsName);
		if (!diceRoll?.resultat || !diceRoll.resultat.result.length) return undefined;
		if (diceRoll) applyCommentsToResult(diceRoll.resultat, comments, undefined);
		return { detectRoll: undefined, result: diceRoll.resultat };
	}

	return undefined;
}

function getRollInShared(dice: string) {
	const main = DICE_PATTERNS.GLOBAL_COMMENTS_GROUP.exec(dice)?.groups?.comment;
	dice = dice.replace(DICE_PATTERNS.GLOBAL_COMMENTS_GROUP, "");
	const rollDice = roll(dice);
	if (!rollDice) return undefined;

	rollDice.dice = dice;
	if (main) rollDice.comment = main;
	return rollDice;
}

export function getRoll(dice: string): Resultat | undefined {
	if (dice.includes(";")) return getRollInShared(dice);
	const comments = dice
		.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3]
		.replaceAll("*", "\\*");
	if (comments) {
		dice = dice.replace(DICE_PATTERNS.DETECT_DICE_MESSAGE, "$1");
	}
	dice = dice.trim();
	try {
		const rollDice = roll(dice);
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
 */
export function replaceStatsInDiceFormula(
	content: string,
	stats?: Record<string, number>,
	deleteComments = false,
	shared = false,
	statsName?: string[]
): { formula: string; infoRoll?: string } {
	if (!stats) return { formula: content };
	//remove secondary opposition

	let comments = content.match(DICE_PATTERNS.DETECT_DICE_MESSAGE)?.[3];
	let diceFormula = content;
	const statsFounds: string[] = [];
	if (comments) diceFormula = diceFormula.replace(comments, "").trim() ?? "";
	else comments = "";

	let processedFormula = diceFormula;

	const variableMatches = [
		...processedFormula.matchAll(REMOVER_PATTERN.VARIABLE_MATCHER),
	];

	// Pre-process stats for better performance
	const normalizedStats = new Map<string, [string, number]>();
	for (const [key, value] of Object.entries(stats)) {
		const normalized = key.standardize();
		normalizedStats.set(normalized, [key, value]);
	}

	for (const match of variableMatches) {
		const fullMatch = match[0];
		const searchTerm = match[1].standardize();

		if (!processedFormula.includes(fullMatch)) continue;

		// Use the generic helper to find the best match (exact or partial)
		const foundStat = findBestStatMatch<[string, number]>(searchTerm, normalizedStats);

		if (foundStat) {
			const [original, statValue] = foundStat;
			statsFounds.push(original.capitalize());
			const escapedMatch = fullMatch.replace(/\$/g, "\\$");
			const regex = getCachedRegex(`${escapedMatch}(?![\\w\\p{L}])`, "gu");
			processedFormula = processedFormula.replace(regex, statValue.toString());
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
	}
	if (deleteComments) return { formula: processedFormula, infoRoll: uniqueStats[0] };
	return { formula: `${processedFormula} ${comments}`, infoRoll: uniqueStats[0] };
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
