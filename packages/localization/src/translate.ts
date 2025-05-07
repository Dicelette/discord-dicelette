import {
	DiceTypeError,
	EmptyObjectError,
	FormulaError,
	NoStatisticsError,
} from "@dicelette/core";
import { InvalidCsvContent, NoChannel, NoEmbed, logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import { default as i18next } from "i18next";
import { ALL_TRANSLATION_KEYS } from "./flattenJson";
import { resources } from "./types";

export const t = i18next.getFixedT("en");

export function ln(userLang: Djs.Locale) {
	if (userLang === Djs.Locale.EnglishUS || userLang === Djs.Locale.EnglishGB)
		return i18next.getFixedT("en");
	const localeName = Object.entries(Djs.Locale).find(([name, abbr]) => {
		return name === userLang || abbr === userLang;
	});
	return i18next.getFixedT(localeName?.[1] ?? "en");
}

export function lError(
	e: Error,
	interaction?: Djs.BaseInteraction,
	userLang?: Djs.Locale
) {
	const ul = ln(userLang ?? interaction?.locale ?? Djs.Locale.EnglishUS);
	if (e instanceof DiceTypeError) {
		if (e.cause !== "noBulkRoll")
			return ul("error.invalidDice.withDice", { dice: e.dice });
		return ul("error.noBulkRoll");
	}
	if (e instanceof FormulaError)
		return ul("error.invalidFormula", { formula: e.formula });

	if (e.message.includes("Max_Greater")) {
		const max = e.message.split(";")[2];
		const min = e.message.split(";")[1];
		return ul("error.mustBeGreater", { max: max, value: min });
	}

	if (e instanceof EmptyObjectError) return ul("error.emptyDamage");

	if (e.message.includes("TooManyDice")) return ul("error.tooMuchDice");

	if (e instanceof NoStatisticsError) return ul("error.stats.empty");

	if (e.message.includes("TooManyStats")) return ul("error.stats.tooMuch");

	if (e instanceof NoEmbed) return ul("error.noEmbed");

	if (e instanceof InvalidCsvContent) return ul("error.csvContent", { fichier: e.file });

	if (e instanceof NoChannel) return ul("error.channel", { channel: "" });

	if (e instanceof Djs.DiscordAPIError) {
		if (e.method === "DELETE") {
			logger.warn("Error while deleting message", e);
			return "";
		}
		if (e.code === 50001) return ul("error.missingPermission");
		if (e.code === 50013) return ul("error.botMissingPermission");
		return ul("error.discord", { code: e.code, stack: e.stack });
	}
	if (e.message.includes(":warning:")) return ul("error.generic.e", { e });
	return ul("error.generic.withWarning", { e });
}

export function cmdLn(key: string) {
	const localized: Djs.LocalizationMap = {};
	const allValidLocale = Object.entries(Djs.Locale);
	const allTranslatedLanguages = Object.keys(resources).filter(
		(lang) => !lang.includes("en")
	);
	for (const [name, Locale] of allValidLocale) {
		if (allTranslatedLanguages.includes(Locale)) {
			const ul = ln(name as Djs.Locale);
			localized[Locale as Djs.Locale] = ul(key);
		}
	}
	return localized;
}

export function findln(translatedText: string) {
	const allLocales = Object.keys(resources);
	for (const locale of allLocales) {
		const ul = ln(locale as Djs.Locale);
		for (const key of ALL_TRANSLATION_KEYS) {
			if (ul(key).toLowerCase() === translatedText.toLowerCase()) {
				return key;
			}
		}
	}
	return translatedText;
}
