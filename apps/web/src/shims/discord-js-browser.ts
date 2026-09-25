/** Browser-safe replacement for `discord.js`: localization's translate.ts only needs the runtime `Locale` enum and
 * `DiscordAPIError` class, so a Vite alias swaps the real (Node-only) discord.js for this shim; types still resolve normally. */
export { Locale } from "discord-api-types/v10";

/** Stub used only for `instanceof` checks in localization error helpers that
 *  the playground never triggers. */
export class DiscordAPIError extends Error {}
