/** No-op `dotenv` for the browser: `@dicelette/types`'s constants.ts calls `dotenv.config()` at load, but there's
 * no `.env`/`fs` in the browser, so a Vite alias swaps it for this stub and constants.ts falls back to its defaults. */
export function config() {
	return { parsed: {} };
}

export default { config };
