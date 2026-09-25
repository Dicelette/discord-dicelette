/** Swaps `@dice-roller/rpg-dice-roller`'s default `nodeCrypto` RNG engine (which needs Node's `crypto` module) for
 * `browserCrypto` on the shared `NumberGenerator` singleton, so core's hardcoded engine works in the browser. */
import { NumberGenerator } from "@dice-roller/rpg-dice-roller";

NumberGenerator.engines.nodeCrypto = NumberGenerator.engines.browserCrypto;
