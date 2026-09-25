import type { ComparedValue, CustomCritical, Resultat } from "@dicelette/core";
import type * as Djs from "discord.js";

export interface DiceExtractionResult {
	result: Resultat;
	detectRoll: string | undefined;
	infoRoll?: string;
	/** Stats names per segment for shared rolls (e.g., ['Dext', 'Force'] for `1d100+$dext;&+$force`) */
	statsPerSegment?: string[];
}

/** Comments chained in a shared dice roll, e.g. `1d20;&+5[comments for roll] comments global`. */
export interface ChainedComments {
	content: string;
	comments: string | undefined;
}

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
	criticalOverrides?: Record<string, CustomCritical> | undefined;
	opposition?: ComparedValue;
	silent?: boolean;
	/** Stats names per segment for shared rolls (e.g., ['Dext', 'Force'] for `1d100+$dext;&+$force`) */
	statsPerSegment?: string[];
	/** Optional comment to attach to the result without going through the dice string */
	comment?: string;
};
