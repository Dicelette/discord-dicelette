import EnglishUS from "../locales/en.json" with { type: "json" };
import French from "../locales/fr.json" with { type: "json" };

export const resources = {
	en: {
		translation: EnglishUS,
	},
	fr: {
		translation: French,
	},
};

export enum LocalePrimary {
	// noinspection JSUnusedGlobalSymbols
	French = "Français",
	English = "English",
}
