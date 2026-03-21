import { resources } from "./types";

interface JsonObject {
	//biome-ignore lint/suspicious/noExplicitAny: we need to allow any type of value
	[key: string]: any;
}

/**
 * Recursively flattens a nested JSON object into a single-level object with dot-separated keys.
 *
 * @param obj - The JSON object to flatten.
 * @param parentKey - The prefix for keys during recursion.
 * @param result - The accumulator for flattened key-value pairs.
 * @returns A flat object where each key represents the path to a value in the original object, joined by dots.
 */
export function flattenJson(
	obj: JsonObject,
	parentKey = "",
	result: JsonObject = {}
): JsonObject {
	for (const key in obj) {
		// biome-ignore lint/suspicious/noPrototypeBuiltins: we need to check for own properties
		if (obj.hasOwnProperty(key)) {
			const newKey = parentKey ? `${parentKey}.${key}` : key;
			if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
				flattenJson(obj[key], newKey, result);
			} else {
				result[newKey] = obj[key];
			}
		}
	}
	return result;
}

export const ALL_TRANSLATION_KEYS = Object.keys(flattenJson(resources.en.translation));
