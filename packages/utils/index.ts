import { important, logger } from "./src/logger";
import "uniformize";
import { standardizeDice } from "@dicelette/core";

export { logger, important };
export * from "./src/changelog";
export { default as dev } from "./src/dev";

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
	if (url.match(/^(https:\/{2})[\w\-./%]+\/[\w\-.%]+\.(jpe?g|gifv?|png|webp)$/gi))
		return url;
	return false;
}

export function cleanAvatarUrl(url: string) {
	if (url.match(/(cdn|media)\.discordapp\.(net|com)/gi)) return url.replace(/\?.*$/g, "");
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
	const regex = /(?<open>\p{P})(?<enclosed>.*?)(?<close>\p{P})/gu;
	let remainingText = input;
	let result = input;
	for (const match of input.matchAll(regex)) {
		const { open, enclosed, close } = match.groups ?? {};
		if (open && enclosed && close) {
			const capitalized = enclosed.capitalize();
			result = result.replace(match[0], `${open}${capitalized}${close}`);
			remainingText = remainingText.replace(match[0], "").trim(); // Remove processed section
		}
	}
	remainingText = remainingText.toTitle();
	result = result.replace(new RegExp(`\\b${remainingText}\\b`, "gi"), remainingText);
	return result;
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

export function isValidJSON(jsonString: string): boolean {
	try {
		JSON.parse(jsonString);
		return true;
	} catch (e) {
		return false;
	}
}
