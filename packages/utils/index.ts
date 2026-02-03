/** biome-ignore-all lint/style/useNamingConvention: Until biome support this kind of configuration, we need to ignore the naming rules */
import "uniformize";
import { getEngine, standardizeDice } from "@dicelette/core";
import { logger } from "@sentry/node";
import { Random } from "random-js";

export * from "./src/changelog";
export { default as dev } from "./src/dev";
export * from "./src/humanizeDuration";
export * from "./src/logger";
export * from "./src/regex";
export * from "./src/similarity";

/**
 * Get the random engine using node's crypto module
 */
export const random = new Random(getEngine("nodeCrypto"));

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
	const uniqueArray: string[] = [];
	const isUnique: Map<string, boolean> = new Map();

	for (const item of array) {
		const formattedItem = item.standardize();
		if (!isUnique.get(formattedItem)) {
			uniqueArray.push(item);
			isUnique.set(formattedItem, true);
		}
	}
	return uniqueArray;
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
		logger.warn(`Invalid JSON format: ${e}`);
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
