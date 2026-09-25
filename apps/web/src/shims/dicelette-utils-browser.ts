/** Browser-safe replacement for `@dicelette/utils`. */

export * from "@dicelette/utils/errors";
export * from "@dicelette/utils/karma";
export * from "@dicelette/utils/regex";

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

// Mirrors the real tslog logger's prod vs dev minLevel (packages/utils/src/logger.ts):
// trace/debug/silly are development-only noise, silenced in the built app.
const verbose: LogFn = import.meta.env.DEV ? console.debug.bind(console) : noop;

/** Console-backed stand-in for the tslog logger used by the shared packages. */
export const logger: Record<string, LogFn> = {
	trace: verbose,
	debug: verbose,
	info: console.info.bind(console),
	warn: console.warn.bind(console),
	error: console.error.bind(console),
	fatal: console.error.bind(console),
	silly: verbose,
};
