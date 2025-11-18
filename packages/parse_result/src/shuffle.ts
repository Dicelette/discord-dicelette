/**
 * Shuffle and choose a value from an array
 */

import { getEngine, randomInt } from "@dicelette/core";
import { createShuffle } from "fast-shuffle";

/**
 * Return a random element or multiple random elements from an array
 * @param array {unknown[]} The array to choose from
 * @param nbToChoose {number} The number of elements to choose. If not provided, a single element is chosen.
 * @returns {unknown[]} An array of chosen elements
 */
export function shuffle(array: unknown[], nbToChoose?: number): unknown[] {
	//use a random number from nodeCrypto
	const engine = getEngine("nodeCrypto");
	const seed = randomInt(0, Number.MAX_SAFE_INTEGER, engine);
	const suffle = createShuffle(seed);
	const shuffledArray = suffle(array);
	if (nbToChoose && nbToChoose > 0) {
		return shuffledArray.slice(0, nbToChoose);
	}
	return [shuffledArray[0]];
}
