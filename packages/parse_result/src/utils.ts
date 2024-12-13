import { type Resultat, generateStatsDice, roll } from "@dicelette/core";
import { isNumber } from "@dicelette/utils";
import moment from "moment";
import { DETECT_DICE_MESSAGE } from "./interfaces";

export function timestamp(time?: boolean) {
	if (time) return ` • <t:${moment().unix()}:d>-<t:${moment().unix()}:t>`;
	return "";
}

export function getRoll(dice: string): Resultat | undefined {
	const comments = dice.match(DETECT_DICE_MESSAGE)?.[3].replaceAll("*", "\\*");
	if (comments) {
		dice = dice.replace(DETECT_DICE_MESSAGE, "$1");
	}
	dice = dice.trim();
	const rollDice = roll(dice.trim().toLowerCase());
	if (!rollDice) {
		return undefined;
	}
	if (comments) {
		rollDice.comment = comments;
		rollDice.dice = `${dice} /* ${comments} */`;
	}
	return rollDice;
}

export function getModif(
	modif: string,
	statistics?: Record<string, number>,
	statValue?: number
): string {
	if (isNumber(modif)) {
		const res = Number.parseInt(modif, 10);
		if (res > 0) return `+${res}`;
		if (res < 0) return `${res}`;
		return "";
	}
	modif = generateStatsDice(modif, statistics, statValue?.toString());
	if (!modif.startsWith("+") && !modif.startsWith("-")) return `+${modif}`;
	return modif;
}

export function convertNameToValue(
	diceName: string,
	statistics?: Record<string, number>
): Partial<{ total: string; diceResult: string }> | undefined {
	if (!statistics) return undefined;
	const formule = /\((?<formula>.+)\)/gm;
	const match = formule.exec(diceName);
	if (!match) return undefined;
	const { formula } = match.groups || {};
	if (!formula) return undefined;
	const result = generateStatsDice(formula, statistics);
	const isRoll = getRoll(result);
	if (isRoll?.total)
		return {
			total: isRoll.total.toString(),
			diceResult: isRoll.result,
		};
	return { total: result };
}

export function uniformizeRecords(input: Record<string, string | number>) {
	return Object.fromEntries(
		Object.entries(input).map(([key, value]) => [
			key.standardize(),
			typeof value === "string" ? value.standardize() : value,
		])
	) as Record<string, string | number>;
}
