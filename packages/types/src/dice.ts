import type { Resultat } from "@dicelette/core";

/**
 * Interface pour le résultat de l'extraction de dés
 */
export interface DiceExtractionResult {
	result: Resultat;
	detectRoll: string | undefined;
	infoRoll?: string;
}

/**
 * Interface pour les commentaires enchaînés
 */
export interface ChainedComments {
	content: string;
	comments: string | undefined;
}

/**
 * Interface pour les données de dés extraites
 */
export interface DiceData {
	bracketRoll: string | undefined;
	comments: string | undefined;
	diceValue: RegExpMatchArray | null;
}
