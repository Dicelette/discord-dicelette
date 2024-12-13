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

export function replaceStatInDice(
	diceName: string,
	statistics?: Record<string, number>,
	customReplacement?: string
) {
	const originalDice = diceName;
	const statName = Object.keys(statistics ?? {})
		.map((key) => key.removeAccents().toLowerCase())
		.join("|");
	if (!statName) return originalDice;

	// Regex pour détecter les parenthèses avec un contenu matchant un des noms dans "statName"
	const regex = new RegExp(`\\((${statName})\\)`, "gi");

	// Standardiser le texte du dé pour trouver l'emplacement du match
	const standardizedDice = originalDice.standardize();
	const match = regex.exec(standardizedDice);
	if (!match) return originalDice;

	// Calculer l'emplacement du match dans le texte original
	const startIndex = standardizedDice.indexOf(match[0]);
	const endIndex = startIndex + match[0].length;

	// Utiliser le remplacement personnalisé ou la valeur statistique
	const statKey = match[1].removeAccents().toLowerCase().trim();
	const replacementValue = customReplacement ?? statistics?.[statKey];

	if (replacementValue === undefined) return originalDice;

	// Remplacer uniquement l'emplacement correspondant dans le texte original
	let result = "";
	if (replacementValue?.toString().length === 0)
		result = originalDice.slice(0, startIndex) + originalDice.slice(endIndex);
	else
		result = `${originalDice.slice(0, startIndex)}(${replacementValue})${originalDice.slice(endIndex)}`;

	return result.trim(); // Nettoyer les espaces résiduels
}

export function convertNameToValue(
	diceName: string,
	statistics?: Record<string, number>
): Partial<{ total: string; diceResult: string }> | undefined {
	if (!statistics) return undefined;
	const statName = Object.keys(statistics).join("|");
	const formule = new RegExp(`\\((?<formula>${statName})\\)`, "i");
	const match = formule.exec(diceName.standardize());
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
