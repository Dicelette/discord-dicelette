import { resources } from "./src/types";

export * from "./src/flattenJson";
export * from "./src/translate";
export * from "./src/types";

import i18next from "i18next";

await i18next.init({
	lng: "en",
	fallbackLng: "en",
	returnNull: false,
	resources,
});

i18next?.services?.formatter?.add("optional", (value, _lng, _options) => {
	if (value === undefined || value === null) return "";
	if (typeof value === "string") {
		if (!value.length) return "";
		return `(${value})`;
	}
	return value;
});
