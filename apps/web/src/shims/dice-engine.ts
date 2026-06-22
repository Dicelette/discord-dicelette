/**
 * Makes `@dicelette/core`'s dice roller work in the browser.
 *
 * `@dicelette/core` rolls dice via `@dice-roller/rpg-dice-roller`, whose default
 * RNG engine is `nodeCrypto` — it calls `require("crypto").randomBytes`, which
 * does not exist in the browser. Core hardcodes that default
 * (`roll(dice, engine = NumberGenerator.engines.nodeCrypto, …)`) and the
 * `parse_result` helpers (`getRoll`, …) call it without passing an engine.
 *
 * Rather than threading an engine parameter through every shared function, we
 * swap the `nodeCrypto` engine reference for `browserCrypto` (backed by
 * `crypto.getRandomValues`) on the shared `NumberGenerator` singleton. Core
 * reads `NumberGenerator.engines.nodeCrypto` at call time, so every roll then
 * uses a browser-safe engine. Importing this module for its side effect — once,
 * before any roll — is enough.
 */
import { NumberGenerator } from "@dice-roller/rpg-dice-roller";

NumberGenerator.engines.nodeCrypto = NumberGenerator.engines.browserCrypto;
