import { reverseLookup } from "./src/reverse_lookup";
import { resources } from "./src/types";

export * from "./src/flattenJson";
export { findln } from "./src/reverse_lookup";
export * from "./src/translate";
export * from "./src/types";

import i18next from "i18next";

await i18next.use(reverseLookup).init({
	fallbackLng: "en",
	lng: "en",
	resources,
	returnNull: false,
	interpolation: {
		escapeValue: false,
	},
});

i18next?.services?.formatter?.add("optional", (value, _lng, _options) => {
	if (value === undefined || value === null) return "";
	if (typeof value === "string") {
		if (!value.length) return "";
		return `(${value})`;
	}
	return value;
});
