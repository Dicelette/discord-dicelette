import {
	type Resultat,
	generateStatsDice,
	replaceFormulaInDice,
	roll,
} from "@dicelette/core";
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
	modif = replaceValue(modif, statistics, statValue);
	if (!modif.startsWith("+") && !modif.startsWith("-")) return `+${modif}`;
	return modif;
}

export function replaceValue(
	modif: string,
	statistics?: Record<string, number>,
	statValue?: number | string
) {
	if (statValue) modif = modif.replaceAll("$", statValue.toString());
	if (statistics) modif = generateStatsDice(modif, statistics);
	return replaceFormulaInDice(modif);
}

export function convertNameToValue(
	diceName: string,
	statistics?: Record<string, number>
) {
	if (!statistics) return diceName;
	const formule = /\((?<formula>.+)\)/gm;
	const match = formule.exec(diceName);
	if (!match) return undefined;
	const { formula } = match.groups || {};
	if (!formula) return undefined;
	return replaceValue(formula, statistics);
}
