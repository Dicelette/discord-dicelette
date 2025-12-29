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

/**
 * Trigger pity based on threshold and userFailNb.
 * Below 75% of threshold, no pity.
 * Between 75% and 100% of threshold, increase chance to trigger pity (starting at 50% to trigger)
 * When threshold >=1, pity is always triggered.
 * @param {number} threshold Threshold to trigger pity in the guild settings
 * @param {number} userFailNb Number of consecutive failures of the user
 * @returns {boolean} True if pity is triggered, False otherwise
 */
export function triggerPity(threshold?: number, userFailNb?: number):boolean {
	if (!threshold || !userFailNb) return false;
	//at 75% of threshold, we trigger 75% chance to trigger pity
	//at 100% of threshold, we trigger 100% chance to trigger pity
	//otherwise, no pity
	const triggerChance = Math.min(userFailNb / threshold, 1);
	if (triggerChance <0.75) return false;
	if (triggerChance >=1) return true;
	//the roll should be lower and lower when we approach the threshold so we need to set the max to something that decrease with triggerChance
	const t = (triggerChance - 0.75) / 0.25; // normalise sur [0,1]
  const alpha = 1;
	// Probability calculation
	//starting at 0.5 when t=0, going to 1 when t=1
	const p = 0.5 + 0.5 * t ** alpha;
	
	// Perform the random trial
	const u = random.real(0, 1, false);
	return u <= p;
}