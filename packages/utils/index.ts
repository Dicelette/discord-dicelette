import { important, logger } from "./src/logger";
import "uniformize";

export { logger, important };

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
	if (url.match(/^(https:)([\/|.\w\s\-_])*(?:jpe?g|gifv?|png|webp)$/gi)) return url;
	return false;
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

export const isNumber = (value: unknown): boolean =>
	value !== undefined &&
	(typeof value === "number" ||
		(!Number.isNaN(Number(value)) &&
			typeof value === "string" &&
			value.trim().length > 0));

export * from "./src/errors";
