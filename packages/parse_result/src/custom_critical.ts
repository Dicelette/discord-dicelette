import { type CustomCritical, generateStatsDice } from "@dicelette/core";
import type { CustomCriticalRoll } from "@dicelette/types";
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
	custom: Record<string, CustomCritical>,
	statValue?: number,
	statistics?: Record<string, number>
) {
	const customCritical: Record<string, CustomCriticalRoll> = {};
	for (const [name, value] of Object.entries(custom)) {
		value.value = generateStatsDice(value.value, statistics, statValue?.toString());
		customCritical[name] = rollOneCustomCritical(value);
	}
	return customCritical;
}

export function skillCustomCritical(
	customCritical?: Record<string, CustomCritical>,
	statistics?: Record<string, number>,
	dollarsValue?: string | number
): Record<string, CustomCritical> | undefined {
	if (!customCritical) return undefined;
	const customCriticalFiltered: Record<string, CustomCritical> = {};
	for (const [name, value] of Object.entries(customCritical)) {
		if (!dollarsValue && !value.value.includes("$")) continue;
		if (value.affectSkill && dollarsValue) {
			value.value = generateStatsDice(value.value, statistics, dollarsValue?.toString());
			customCriticalFiltered[name] = rollOneCustomCritical(value);
		}
	}
	if (Object.keys(customCriticalFiltered).length === 0) return undefined;
	return customCriticalFiltered;
}
