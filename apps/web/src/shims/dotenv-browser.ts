/**
 * No-op `dotenv` for the browser bundle.
 *
 * `@dicelette/types`'s `constants.ts` calls `dotenv.config()` at module load to
 * read emoji ids from the environment. That module is pulled into the web
 * bundle because `@dicelette/parse_result` imports runtime values from
 * `@dicelette/types`. There is no `.env` (nor `fs`/`path`/`os`) in the browser,
 * so a Vite alias swaps `dotenv` for this stub; `constants.ts` then falls back
 * to its built-in default ids, which is exactly what a public playground wants.
 */
export function config() {
	return { parsed: {} };
}

export default { config };
