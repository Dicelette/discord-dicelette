import type { i18n, ThirdPartyModule } from "i18next";
import { flattenJson } from "./flattenJson";

let instance: i18n | undefined;
let index: Map<string, string> | undefined;

/** Keeps a lowercased text → key index, rebuilt lazily whenever resources change. */
export const reverseLookup: ThirdPartyModule = {
	type: "3rdParty",
	init(i18next) {
		instance = i18next;
		const invalidate = () => {
			index = undefined;
		};
		i18next.store.on("added", invalidate);
		i18next.store.on("removed", invalidate);
	},
};

function buildIndex(i18next: i18n) {
	const map = new Map<string, string>();
	for (const lng of Object.keys(i18next.store.data)) {
		const flat = flattenJson(i18next.getResourceBundle(lng, "translation") ?? {});
		for (const [key, value] of Object.entries(flat)) {
			if (typeof value !== "string") continue;
			const text = value.toLowerCase();
			if (!map.has(text)) map.set(text, key);
		}
	}
	return map;
}

/** Returns the translation key of a translated text (any language), or the text itself. */
export function findln(translatedText: string) {
	if (!instance) return translatedText;
	index ??= buildIndex(instance);
	return index.get(translatedText.toLowerCase()) ?? translatedText;
}
