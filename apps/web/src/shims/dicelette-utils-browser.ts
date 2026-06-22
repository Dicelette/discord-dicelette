/**
 * Browser-safe replacement for `@dicelette/utils`.
 *
 * The real `@dicelette/utils` barrel is Node-only: it imports `node:path`,
 * `@sentry/node`, `dotenv` and builds a `random-js` engine at module load.
 * The dice parsing/formatting code (`@dicelette/parse_result`) only needs the
 * pure regex tables, the error classes, and a `logger`/`sentry` surface — none
 * of which require Node. A Vite alias (and the matching tsconfig path) points
 * `@dicelette/utils` to this shim for the web bundle only; the bot and server
 * keep using the real package.
 */

export * from "@dicelette/utils/errors";
export * from "@dicelette/utils/regex";

type LogFn = (...args: unknown[]) => void;

/** Console-backed stand-in for the tslog logger used by the shared packages. */
export const logger: Record<string, LogFn> = {
	trace: console.debug.bind(console),
	debug: console.debug.bind(console),
	info: console.info.bind(console),
	warn: console.warn.bind(console),
	error: console.error.bind(console),
	fatal: console.error.bind(console),
	silly: console.debug.bind(console),
};

/** No-op Sentry surface (no crash reporting in the public playground). */
const noop: LogFn = () => {};
export const sentry = {
	debug: noop,
	error: noop,
	fatal: noop,
	info: noop,
	warn: noop,
};
