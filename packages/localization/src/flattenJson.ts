import { resources } from "./types";

interface JsonObject {
	//biome-ignore lint/suspicious/noExplicitAny: we need to allow any type of value
	[key: string]: any;
}

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
