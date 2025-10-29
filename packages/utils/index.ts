/** biome-ignore-all lint/style/useNamingConvention: Until biome support this kind of configuration, we need to ignore the naming rules */
import { important, logger } from "./src/logger";
import "uniformize";
import { standardizeDice } from "@dicelette/core";

export { logger, important };
export * from "./src/changelog";
export { default as dev } from "./src/dev";

// Pre-compiled regex patterns for better performance
const COMPILED_PATTERNS = {
	AVATAR_URL: /^(https:\/{2})[\w\-./%]+\/[\w\-.%]+\.(jpe?g|gifv?|png|webp)$/gi,
	DISCORD_CDN: /(cdn|media)\.discordapp\.(net|com)/gi,
	PUNCTUATION_ENCLOSED: /(?<open>\p{P})(?<enclosed>.*?)(?<close>\p{P})/gu,
	QUERY_PARAMS: /\?.*$/g,
	REGEX_ESCAPE: /[.*+?^${}()|[\]\\]/g,
	WORD_BOUNDARY: (text: string) => new RegExp(`\\b${escapeRegex(text)}\\b`, "gi"),
} as const;

/**
 * filter the choices by removing the accents and check if it includes the removedAccents focused
 * @param choices {string[]}
 * @param focused {string}
 */
export function filterChoices(choices: string[], focused: string) {
	//remove duplicate from choices, without using set
	const values = uniqueValues(choices).filter((choice) =>
		choice.subText(focused.removeAccents())
	);
	if (values.length >= 25) return values.slice(0, 25);
	return values;
}

function uniqueValues(array: string[]) {
	const seen: Record<string, boolean> = {};
	const uniqueArray: string[] = [];

	for (const item of array) {
		const formattedItem = item.standardize();
		if (!seen[formattedItem]) {
			seen[formattedItem] = true;
			uniqueArray.push(item);
		}
	}
	return uniqueArray;
}

export function verifyAvatarUrl(url: string) {
	if (url.length === 0) return false;
	if (url.startsWith("attachment://")) return url;
	// Reset lastIndex for global regex to avoid issues
	COMPILED_PATTERNS.AVATAR_URL.lastIndex = 0;
	if (url.match(COMPILED_PATTERNS.AVATAR_URL)) return url;
	return false;
}

export function cleanAvatarUrl(url: string) {
	if (url.match(COMPILED_PATTERNS.DISCORD_CDN))
		return url.replace(COMPILED_PATTERNS.QUERY_PARAMS, "");
	return url;
}

/**
 * Verify if an array is equal to another
 * @param array1 {string[]|undefined}
 * @param array2 {string[]|undefined}
 */
export function isArrayEqual(array1: string[] | undefined, array2: string[] | undefined) {
	if (!array1 || !array2) return false;
	return (
		array1.length === array2.length &&
		array1.every((value, index) => value === array2[index])
	);
}
export function capitalizeBetweenPunct(input: string) {
	// Regex to find sections enclosed by punctuation marks
	let remainingText = input;
	let result = input;
	for (const match of input.matchAll(COMPILED_PATTERNS.PUNCTUATION_ENCLOSED)) {
		const { open, enclosed, close } = match.groups ?? {};
		if (open && enclosed && close) {
			const capitalized = enclosed.capitalize();
			result = result.replace(match[0], `${open}${capitalized}${close}`);
			remainingText = remainingText.replace(match[0], "").trim(); // Remove processed section
		}
	}
	remainingText = remainingText.toTitle();
	result = result.replace(COMPILED_PATTERNS.WORD_BOUNDARY(remainingText), remainingText);
	return result;
}

function escapeRegex(string: string) {
	return string.replace(COMPILED_PATTERNS.REGEX_ESCAPE, "\\$&");
}

export * from "./src/errors";

export function uniformizeRecords(input: Record<string, string | number>) {
	return Object.fromEntries(
		Object.entries(input).map(([key, value]) => [
			key.standardize(),
			typeof value === "string" ? standardizeDice(value) : value,
		])
	) as Record<string, string | number>;
}

export function allValuesUndefined(obj: unknown): boolean {
	if (obj === null || obj === undefined) return true;

	if (typeof obj !== "object") return false;

	if (Array.isArray(obj)) {
		return obj.every((item) => allValuesUndefined(item));
	}

	const entries = Object.entries(obj);
	if (entries.length === 0) return true;

	return entries.every(([, value]) => allValuesUndefined(value));
}

export function isValidJSON(jsonString: string): unknown | false {
	try {
		return JSON.parse(jsonString) as unknown;
	} catch (e) {
		logger.fatal(`Invalid JSON format: ${e}`);
		return false;
	}
}

export function allValueUndefOrEmptyString(obj: unknown): boolean {
	if (obj === null || obj === undefined) return true;

	if (typeof obj !== "object") return false;
	if (Array.isArray(obj)) {
		return obj.every((item) => allValueUndefOrEmptyString(item));
	}
	return Object.values(obj).every(
		(value) =>
			value === undefined ||
			value === null ||
			(typeof value === "string" && value.trim() === "") ||
			(typeof value === "object" && allValueUndefOrEmptyString(value))
	);
}
