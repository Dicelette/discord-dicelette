import {
	type ComparedValue,
	type CustomCritical,
	DiceTypeError,
	generateStatsDice,
	isNumber,
	MIN_THRESHOLD_MATCH,
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
import type { Sign } from "./interfaces";

const botErrorOptions: BotErrorOptions = {
	cause: "CUSTOM_CRITICAL",
	level: BotErrorLevel.Warning,
};

/** Turns `(N) Name SIGN VALUE` into a custom critical object: `{[name]: CustomCritical}`. */
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
			sign: sign.trimAll() as Sign,
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
	const replaced = generateStatsDice(
		opposition,
		userStatistique,
		MIN_THRESHOLD_MATCH,
		dollarValue
	);
	const signRegex = /(?<sign>[><=!]+)(?<comparator>(.+))/;
	const match = signRegex.exec(replaced);
	const comparator = match?.groups?.comparator || replaced;
	const comp = signRegex.exec(diceComparator);
	let sign = match?.groups?.sign || comp?.groups?.sign;
	if (!sign || !comparator) return;
	const rolledValue = getRoll(comparator, undefined, sort);
	if (sign === "=") sign = "==";
	if (rolledValue?.total !== undefined) {
		return {
			originalDice: rolledValue.dice,
			rollValue: rolledValue.result,
			sign: sign as Sign,
			value: rolledValue.total,
		};
	}
	if (!isNumber(comparator))
		throw new DiceTypeError(rolledValue?.dice ?? opposition, "opposition", {
			comparator,
		});
	return {
		sign: sign as Sign,
		value: Number(comparator),
	};
}

function rollOneCustomCritical(critical: CustomCritical, sort?: SortOrder) {
	const rolledValue = getRoll(critical.value, undefined, sort);
	if (rolledValue?.total !== undefined)
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
		value.value = generateStatsDice(
			value.value,
			statistics,
			MIN_THRESHOLD_MATCH,
			statValue?.toString()
		);
		if (value.value.includes("$")) continue;
		customCritical[name] = rollOneCustomCritical(value, sort);
	}
	return customCritical;
}

export function mergeCustomCriticals(
	...layers: (Record<string, CustomCritical> | undefined)[]
): Record<string, CustomCritical> | undefined {
	const merged = Object.assign(
		{},
		...layers.filter((layer) => layer !== undefined)
	) as Record<string, CustomCritical>;
	return Object.keys(merged).length > 0 ? merged : undefined;
}

/** Filters custom criticals that affect skills: kept as-is if their value has no `$` and no `dollarsValue` is
 * given, otherwise substituted via `generateStatsDice` and rolled. */
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
			value.value = generateStatsDice(
				value.value,
				statistics,
				MIN_THRESHOLD_MATCH,
				dollarsValue.toString()
			);
			customCriticalFiltered[name] = rollOneCustomCritical(value, sort);
		}
	}
	if (Object.keys(customCriticalFiltered).length === 0) return undefined;
	return customCriticalFiltered;
}

/** Parses `{cs:value}`/`{cf:value}` in a dice string into custom criticals, overriding the template's. */
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
