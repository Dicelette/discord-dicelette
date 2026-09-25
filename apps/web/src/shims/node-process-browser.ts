/** Minimal `node:process` stand-in: `@dicelette/types`'s constants.ts reads `process.env.*` at load, so a Vite
 * alias points `node:process` here; an empty `env` makes every fallback (`?? "default"`) kick in. */
const browserProcess = { env: {} as Record<string, string | undefined> };

export default browserProcess;
