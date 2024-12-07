import { resources } from "./src/types";

export * from "./src/types";
export * from "./src/translate";
export * from "./src/flattenJson";
import i18next from "i18next";
await i18next.init({
	lng: "en",
	fallbackLng: "en",
	returnNull: false,
	resources,
});
