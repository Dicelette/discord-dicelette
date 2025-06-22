import {
	type ComparedValue,
	type CustomCritical,
	generateStatsDice,
	isNumber,
} from "@dicelette/core";
import type { CustomCriticalRoll, Translation } from "@dicelette/types";
import { evaluate } from "mathjs";
import { getRoll } from "./utils";

/**
 * A function that turn `(N) Name SIGN VALUE` into the custom critical object as `{[name]: CustomCritical}`
 */
export function parseCustomCritical(
	name: string,
	customCritical: string
): Record<string, CustomCritical> | undefined {
	const findPart = /(?<sign>([<>=!]+))(?<value>.*)/gi;
	const match = findPart.exec(customCritical);
	if (!match) return;
	const { sign, value } = match.groups || {};
	if (!name || !sign || !value) return;
	const onNaturalDice = name.startsWith("(N)");
	let nameStr = onNaturalDice ? name.replace("(N)", "") : name;
	const affectSkill = nameStr.includes("(S)");
	nameStr = nameStr.replace("(S)", "");
	return {
		[nameStr.trimStart()]: {
			sign: sign.trimAll() as "<" | ">" | "<=" | ">=" | "!=" | "==",
			value: value.standardize().trimAll(),
			onNaturalDice,
			affectSkill,
		},
	};
}

export function parseOpposition(
	opposition: string,
	diceComparator: string,
	userStatistique?: Record<string, number>,
	userStatStr?: string
): ComparedValue | undefined {
	const replaced = generateStatsDice(opposition, userStatistique, userStatStr);
	const signRegex = /(?<sign>[><=!]+)(?<comparator>(.+))/;
	const match = signRegex.exec(replaced);
	const comparator = match?.groups?.comparator || replaced;
	const comp = signRegex.exec(diceComparator);
	const sign = match?.groups?.sign || comp?.groups?.sign;
	if (!sign || !comparator) return;
	const rolledValue = getRoll(comparator);
	if (rolledValue?.total) {
		return {
			sign: sign as "<" | ">" | "<=" | ">=" | "!=" | "==",
			value: rolledValue.total,
			originalDice: rolledValue.dice,
			rollValue: rolledValue.result,
		};
	}
	if (!isNumber(replaced)) return undefined;
	return {
		sign: sign as "<" | ">" | "<=" | ">=" | "!=" | "==",
		value: Number(replaced),
	};
}

function rollOneCustomCritical(critical: CustomCritical) {
	const rolledValue = getRoll(critical.value);
	if (rolledValue?.total)
		return {
			onNaturalDice: critical.onNaturalDice,
			sign: critical.sign,
			value: rolledValue.total.toString(),
			dice: {
				originalDice: rolledValue.dice,
				rollValue: rolledValue.result,
			},
			affectSkill: critical.affectSkill,
		};
	return {
		onNaturalDice: critical.onNaturalDice,
		sign: critical.sign,
		value: evaluate(critical.value).toString(),
		affectSkill: critical.affectSkill,
	};
}

export function rollCustomCritical(
	custom?: Record<string, CustomCritical>,
	statValue?: number,
	statistics?: Record<string, number>
) {
	if (!custom) return undefined;
	const customCritical: Record<string, CustomCriticalRoll> = {};
	for (const [name, value] of Object.entries(custom)) {
		value.value = generateStatsDice(value.value, statistics, statValue?.toString());
		customCritical[name] = rollOneCustomCritical(value);
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
	dollarsValue?: string | number
): Record<string, CustomCritical> | undefined {
	if (!customCritical) return undefined;
	const customCriticalFiltered: Record<string, CustomCritical> = {};
	for (const [name, value] of Object.entries(customCritical)) {
		if (!value.affectSkill) continue;
		if (!dollarsValue && !value.value.includes("$")) customCriticalFiltered[name] = value;
		else if (dollarsValue && value.value.includes("$")) {
			value.value = generateStatsDice(value.value, statistics, dollarsValue.toString());
			customCriticalFiltered[name] = rollOneCustomCritical(value);
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
		const { natDice, type, value, sign } = match.groups ?? {};
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
					throw new Error(ul("error.customCritical.type_error", { type }));
			}
		} else throw new Error(ul("error.customCritical.type_error", { type }));

		customCritical[textType] = {
			sign: sign as "<" | ">" | "<=" | ">=" | "!=" | "==",
			value: value.standardize(),
			onNaturalDice: !!natDice,
			affectSkill: true,
		};
	}
	return Object.keys(customCritical).length > 0 ? customCritical : undefined;
}

export function rollCustomCriticalsFromDice(
	dice: string,
	ul: Translation,
	statValue?: number,
	statistics?: Record<string, number>
): Record<string, CustomCriticalRoll> | undefined {
	const customCritical = getCriticalFromDice(dice, ul);
	if (!customCritical) return undefined;
	return rollCustomCritical(customCritical, statValue, statistics);
}
