import type { ComparedValue, CustomCritical, Resultat } from "@dicelette/core";
import type * as Djs from "discord.js";

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

export type RollOptions = {
	critical?: { failure?: number | undefined; success?: number | undefined };
	user?: Djs.User;
	charName?: string;
	infoRoll?: { name: string; standardized: string };
	hideResult?: false | true | null;
	customCritical?: Record<string, CustomCritical> | undefined;
	opposition?: ComparedValue;
	silent?: boolean;
};
