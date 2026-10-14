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
} from "@dicelette/utils";
import * as Djs from "discord.js";
import { default as i18next, type TFunction } from "i18next";
import { ZodError } from "zod";

export const t = i18next.getFixedT("en");

export const ln = (locale: Djs.Locale) => i18next.getFixedT(locale);

/** Localizes an error message from its type and the user's language or interaction locale. */
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
		logger.error(e);
		return ul("error.discord", { code: e.code, stack: e.stack });
	}
	if (e.message.includes(":warning:")) return ul("error.generic.e", { e });

	return ul("error.generic.withWarning", { e });
}

export function cmdLn(key: string) {
	const localized: Djs.LocalizationMap = {};
	for (const locale of Object.values(Djs.Locale)) {
		if (!i18next.hasResourceBundle(locale, "translation")) continue;
		// biome-ignore lint/suspicious/noExplicitAny: cmdLn accepts any valid translation key as a plain string
		localized[locale] = ln(locale)(key as any);
	}
	return localized;
}

export function diceTypeError(
	ul: TFunction<"translation", undefined>,
	error: DiceTypeError
): string {
	if (error.cause === "createCriticalCustom") return ul("error.createCriticalCustom");
	if (error.cause === "no_dice_type") return ul("error.noDiceType");
	if (error.cause === "unknown_stats")
		return ul("error.invalidDice.stats", { stats: error.message });
	if (error.message === "testDiceRegistered")
		return ul("error.noRollResult", {
			dice: error.dice,
			formula: error.method?.toString(),
		});
	if (error.cause === "critical_dice_type")
		return ul("error.criticalDiceType", { dice: error.dice });
	if (error.cause === "empty_dice") return ul("error.invalidDice.notFound");
	if (error.cause === "bulk_number") return ul("error.bulk.number", { dice: error.dice });
	if (error.cause === "bulk_zero") return ul("error.bulk.zero", { dice: error.dice });
	if (error.cause === "bulk_max") {
		const { max } = (error.method as { max: number } | undefined) ?? { max: 100 };
		return ul("error.bulk.max", { dice: error.dice, max });
	}
	if (error.cause === "opposition") {
		const { comparator } = error.method as {
			comparator: string;
		};

		return ul("error.invalidDice.opposition", {
			comparator,
		});
	}
	if (error.cause === "invalidDice.compare") {
		const { total, compare, rollValue } = error.method as {
			total: number;
			compare: string;
			rollValue: string | undefined;
		};
		return ul("error.invalidDice.compare", {
			dice: error.dice,
			total,
			compare,
			rollValue,
		});
	}
	return ul("error.invalidDice.default", {
		dice: error.dice,
		error: error.method?.toString(),
	});
}
