/**
 * Browser-safe replacement for `discord.js` (runtime values only).
 *
 * `@dicelette/localization`'s `translate.ts` — pulled in transitively when the
 * playground formats a roll via `ResultAsText` → `ln()` — imports
 * `* as Djs from "discord.js"` and uses two *runtime* symbols: the `Locale`
 * enum and the `DiscordAPIError` class. Everything else it references from
 * discord.js is type-only and erased at build time. Bundling the real
 * discord.js into the browser is not viable (it depends on `node:*`, `ws`,
 * `undici`…), so a Vite alias swaps `discord.js` for this shim in the web
 * bundle. Type-checking still resolves against the real discord.js types.
 */
export { Locale } from "discord-api-types/v10";

/** Stub used only for `instanceof` checks in localization error helpers that
 *  the playground never triggers. */
export class DiscordAPIError extends Error {}
