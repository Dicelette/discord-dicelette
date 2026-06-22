/**
 * Minimal `node:process` stand-in for the browser bundle.
 *
 * `@dicelette/types`'s `constants.ts` does `import process from "node:process"`
 * and reads `process.env.*` (with hardcoded fallbacks) at module load. The
 * browser has no Node `process`, so a Vite alias points `node:process` here.
 * An empty `env` makes every `process.env.X ?? "default"` use its default.
 */
const browserProcess = { env: {} as Record<string, string | undefined> };

export default browserProcess;
