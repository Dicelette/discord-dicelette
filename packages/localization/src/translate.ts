import {
	DiceTypeError,
	EmptyObjectError,
	FormulaError,
	NoStatisticsError,
} from "@dicelette/core";
import {
	BotError,
	InvalidCsvContent,
	logger,
	NoChannel,
	NoEmbed,
	profiler,
	sentry,
} from "@dicelette/utils";
import * as Djs from "discord.js";
import { default as i18next, type TFunction } from "i18next";
import { ZodError } from "zod";
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

/**
 * Returns a localized error message based on the error type and user language or interaction locale.
 *
 * Selects the appropriate translation for a wide range of custom and Discord.js errors, providing user-friendly messages in the user's language when possible.
 *
 * @param e - The error to localize.
 * @param interaction - Optional Discord interaction to determine the user's locale.
 * @param userLang - Optional user language override.
 * @returns The localized error message string.
 */
export function lError(
	e: Error,
	interaction?: Djs.BaseInteraction,
	userLang?: Djs.Locale
) {
	const ul = ln(userLang ?? interaction?.locale ?? Djs.Locale.EnglishUS);
	if (e instanceof DiceTypeError) {
		if (e.cause !== "noBulkRoll") return diceTypeError(ul, e);
		return ul("error.noBulkRoll");
	}
	if (e instanceof ZodError) {
		const issues = e.issues;
		if (issues.length === 0) return ul("error.generic.withWarning", { e });
		const errorMessage: string[] = [];
		for (const issue of issues) {
			const mess = issue.message;
			if (mess.includes("Max_Greater")) {
				const max = issue.message.split(";")[2];
				const min = issue.message.split(";")[1];
				errorMessage.push(ul("error.mustBeGreater", { max, value: min }));
			} else if (mess.includes("TooManyDice")) errorMessage.push(ul("error.tooMuchDice"));
			else if (mess.includes("TooManyStats"))
				errorMessage.push(ul("error.stats.tooMuch"));
			else errorMessage.push(mess);
		}
		if (errorMessage.length === 0) return ul("error.generic.withWarning", { e });
		if (errorMessage.length === 1) return errorMessage[0];
		return `- ${errorMessage.join("\n- ")}`;
	}
	if (e instanceof FormulaError)
		return ul("error.invalidFormula", { formula: e.formula });

	if (e.message.includes("Max_Greater")) {
		const max = e.message.split(";")[2];
		const min = e.message.split(";")[1];
		return ul("error.mustBeGreater", { max: max, value: min });
	}

	if (e instanceof EmptyObjectError) return ul("error.damage.empty");

	if (e.message.includes("TooManyDice")) return ul("error.tooMuchDice");

	if (e instanceof NoStatisticsError) return ul("error.stats.empty");

	if (e.message.includes("TooManyStats")) return ul("error.stats.tooMuch");

	if (e instanceof NoEmbed) return ul("error.embed.notFound");

	if (e instanceof InvalidCsvContent) return ul("error.csvContent", { fichier: e.file });

	if (e instanceof NoChannel) return ul("error.channel.notFound", { channel: "" });

	if (e instanceof BotError) return ul("error.generic.e", { e });

	if (e instanceof Djs.DiscordAPIError) {
		if (e.method === "DELETE") {
			logger.warn("Error while deleting message", e);
			return "";
		}
		if (e.code === 50001) return ul("error.missingPermission");
		if (e.code === 50013) return ul("error.botMissingPermission");
		sentry.error(e);
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

// Cache pour accélérer la recherche de clé par texte traduit
const translationKeyCache: Record<string, string> = {};
let cacheBuilt = false;
export function buildTranslationKeyCache() {
	if (cacheBuilt) return;
	const allLocales = Object.keys(resources);
	for (const locale of allLocales) {
		const ul = ln(locale as Djs.Locale);
		for (const key of ALL_TRANSLATION_KEYS) {
			const translation = ul(key).toLowerCase();
			if (!(translation in translationKeyCache)) {
				translationKeyCache[translation] = key;
			}
		}
	}
	cacheBuilt = true;
	logger.trace("Translation key cache built.");
	return;
}

export function findln(translatedText: string) {
	profiler.startProfiler();
	const normalized = translatedText.toLowerCase();
	const res = translationKeyCache[normalized] ?? translatedText;
	profiler.stopProfiler();
	return res;
}

export function diceTypeError(
	ul: TFunction<"translation", undefined>,
	error: DiceTypeError
): string {
	if (error.cause === "createCriticalCustom") return ul("error.createCriticalCustom");
	if (error.cause === "no_dice_type") return ul("error.noDiceType");
	if (error.message === "no_roll_result" || error.cause === "no_roll_result")
		return ul("error.noRollResult", {
			dice: error.dice,
			formula: error.method?.toString(),
		});
	if (error.cause === "critical_dice_type")
		return ul("error.criticalDiceType", { dice: error.dice });
	return ul("error.invalidDice.default", {
		dice: error.dice,
		error: error.method?.toString(),
	});
}
