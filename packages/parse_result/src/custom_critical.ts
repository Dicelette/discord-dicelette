import { type CustomCritical, roll } from "@dicelette/core";
import type { CustomCriticalRoll } from "@dicelette/types";
import { evaluate } from "mathjs";

import { replaceValue } from "./utils";

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
	const nameStr = onNaturalDice ? name.replace("(N)", "") : name;
	return {
		[nameStr.trimAll()]: {
			sign: sign.trimAll() as "<" | ">" | "<=" | ">=" | "!=" | "==",
			value: value.trimAll(),
			onNaturalDice,
		},
	};
}

export function convertCustomCriticalValue(
	custom: Record<string, CustomCritical>,
	statValue?: number,
	statistics?: Record<string, number>
) {
	const customCritical: Record<string, CustomCriticalRoll> = {};
	for (const [name, value] of Object.entries(custom)) {
		const replacedValue = replaceValue(value.value, statistics, statValue);
		const rolledValue = roll(replacedValue);
		if (rolledValue?.total)
			customCritical[name] = {
				onNaturalDice: value.onNaturalDice,
				sign: value.sign,
				value: rolledValue.total.toString(),
				dice: {
					originalDice: rolledValue.dice,
					rollValue: rolledValue.result,
				},
			};
		else {
			customCritical[name] = {
				onNaturalDice: value.onNaturalDice,
				sign: value.sign,
				value: evaluate(replacedValue).toString(),
			};
		}
	}
	return customCritical;
}

export function filterCustomCritical(
	customCritical?: Record<string, CustomCritical>
): Record<string, CustomCritical> | undefined {
	if (!customCritical) return undefined;
	const customCriticalFiltered: Record<string, CustomCritical> = {};
	for (const [name, value] of Object.entries(customCritical)) {
		if (value.affectSkill) customCriticalFiltered[name] = value;
	}
	if (Object.keys(customCriticalFiltered).length === 0) return undefined;
	return customCriticalFiltered;
}
