import {
	type ComparedValue,
	type CustomCritical,
	generateStatsDice,
	isNumber,
	type SortOrder,
} from "@dicelette/core";
import type { CustomCriticalRoll, Translation } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	DICE_COMPILED_PATTERNS,
} from "@dicelette/utils";
import { evaluate } from "mathjs";
import { getRoll } from "./dice_extractor";

const botErrorOptions: BotErrorOptions = {
	cause: "CUSTOM_CRITICAL",
	level: BotErrorLevel.Warning,
};

/**
 * A function that turn `(N) Name SIGN VALUE` into the custom critical object as `{[name]: CustomCritical}`
 */
export function parseCustomCritical(
	name: string,
	customCritical: string
): Record<string, CustomCritical> | undefined {
	const findPart = new RegExp(DICE_COMPILED_PATTERNS.COMPARATOR, "gi");
	const match = findPart.exec(customCritical);
	if (!match) return;
	let { sign, comparator: value } = match.groups || {};
	if (!name || !sign || !value) return;
	const onNaturalDice = name.startsWith("(N)");
	let nameStr = onNaturalDice ? name.replace("(N)", "") : name;
	const affectSkill = nameStr.includes("(S)");
	nameStr = nameStr.replace("(S)", "");
	if (sign === "=") sign = "==";
	return {
		[nameStr.trimStart()]: {
			affectSkill,
			onNaturalDice,
			sign: sign.trimAll() as "<" | ">" | "<=" | ">=" | "!=" | "==",
			value: value.standardize().trimAll(),
		},
	};
}

export function parseOpposition(
	opposition: string,
	diceComparator: string,
	userStatistique?: Record<string, number>,
	dollarValue?: string,
	sort?: SortOrder
): ComparedValue | undefined {
	const replaced = generateStatsDice(opposition, userStatistique, dollarValue);
	const signRegex = /(?<sign>[><=!]+)(?<comparator>(.+))/;
	const match = signRegex.exec(replaced);
	const comparator = match?.groups?.comparator || replaced;
	const comp = signRegex.exec(diceComparator);
	let sign = match?.groups?.sign || comp?.groups?.sign;
	if (!sign || !comparator) return;
	try {
		const rolledValue = getRoll(comparator, undefined, sort);
		if (sign === "=") sign = "==";
		if (rolledValue?.total) {
			return {
				originalDice: rolledValue.dice,
				rollValue: rolledValue.result,
				sign: sign as "<" | ">" | "<=" | ">=" | "!=" | "==",
				value: rolledValue.total,
			};
		}
		if (!isNumber(comparator)) return undefined;
		return {
			sign: sign as "<" | ">" | "<=" | ">=" | "!=" | "==",
			value: Number(comparator),
		};
	} catch {
		return undefined;
	}
}

function rollOneCustomCritical(critical: CustomCritical, sort?: SortOrder) {
	const rolledValue = getRoll(critical.value, undefined, sort);
	if (rolledValue?.total)
		return {
			affectSkill: critical.affectSkill,
			dice: {
				originalDice: rolledValue.dice,
				rollValue: rolledValue.result,
			},
			onNaturalDice: critical.onNaturalDice,
			sign: critical.sign,
			value: rolledValue.total.toString(),
		};
	return {
		affectSkill: critical.affectSkill,
		onNaturalDice: critical.onNaturalDice,
		sign: critical.sign,
		value: evaluate(critical.value).toString(),
	};
}

export function rollCustomCritical(
	custom?: Record<string, CustomCritical>,
	statValue?: number,
	statistics?: Record<string, number>,
	sort?: SortOrder
) {
	if (!custom) return undefined;
	const customCritical: Record<string, CustomCriticalRoll> = {};
	for (const [name, value] of Object.entries(custom)) {
		value.value = generateStatsDice(value.value, statistics, statValue?.toString());
		if (value.value.includes("$")) continue;
		customCritical[name] = rollOneCustomCritical(value, sort);
	}
	return customCritical;
}

/**
 * Filters and processes custom critical conditions that affect skills.
 *
 * Returns a record of custom criticals with the `affectSkill` flag set to true. If a critical's value does not contain a dollar sign and no {@link dollarsValue} is provided, it is included as-is. Otherwise, if {@link dollarsValue} is provided, the critical's value is updated using {@link generateStatsDice} and rolled with {@link rollOneCustomCritical}.
 *
 * @param customCritical - The set of custom critical conditions to filter and process.
 * @param statistics - Optional statistics used for dice expression generation.
 * @param dollarsValue - Optional value used to substitute into dice expressions containing a dollar sign.
 * @returns A record of processed custom criticals affecting skills, or `undefined` if none match.
 */
export function skillCustomCritical(
	customCritical?: Record<string, CustomCritical>,
	statistics?: Record<string, number>,
	dollarsValue?: string | number,
	sort?: SortOrder
): Record<string, CustomCritical> | undefined {
	if (!customCritical) return undefined;
	const customCriticalFiltered: Record<string, CustomCritical> = {};
	for (const [name, value] of Object.entries(customCritical)) {
		if (!value.affectSkill) continue;
		if (!dollarsValue && !value.value.includes("$")) customCriticalFiltered[name] = value;
		else if (dollarsValue && value.value.includes("$")) {
			value.value = generateStatsDice(value.value, statistics, dollarsValue.toString());
			customCriticalFiltered[name] = rollOneCustomCritical(value, sort);
		}
	}
	if (Object.keys(customCriticalFiltered).length === 0) return undefined;
	return customCriticalFiltered;
}

/**
 * Dice can have the {cs:value} and/or {fs:value} to indicate a custom critical or a failure success. It overrides the template critical.
 * @param dice {string} the dice to parse
 * @param ul
 * @return {success?: number, failure?: number}
 */
export function getCriticalFromDice(
	dice: string,
	ul: Translation
): Record<string, CustomCritical> | undefined {
	const critical = /\{(?<natDice>\*)?(?<type>c[fs]):(?<sign>[<>=!]+)(?<value>.+?)}/gim;
	const customCritical: Record<string, CustomCritical> = {};
	for (const match of dice.matchAll(critical)) {
		let { natDice, type, value, sign } = match.groups ?? {};
		let textType = "";
		if (type) {
			switch (type) {
				case "cs":
					textType = ul("roll.critical.success");
					break;
				case "cf":
					textType = ul("roll.critical.failure");
					break;
				default:
					throw new BotError(
						ul("error.customCritical.type_error", { type }),
						botErrorOptions
					);
			}
		} else
			throw new BotError(
				ul("error.customCritical.type_error", { type }),
				botErrorOptions
			);
		if (sign === "=") sign = "==";
		customCritical[textType] = {
			affectSkill: true,
			onNaturalDice: !!natDice,
			sign: sign as "<" | ">" | "<=" | ">=" | "!=" | "==",
			value: value.standardize(),
		};
	}
	return Object.keys(customCritical).length > 0 ? customCritical : undefined;
}

export function rollCustomCriticalsFromDice(
	dice: string,
	ul: Translation,
	statValue?: number,
	statistics?: Record<string, number>,
	sortOrder?: SortOrder
): Record<string, CustomCriticalRoll> | undefined {
	const customCritical = getCriticalFromDice(dice, ul);
	if (!customCritical) return undefined;
	return rollCustomCritical(customCritical, statValue, statistics, sortOrder);
}
