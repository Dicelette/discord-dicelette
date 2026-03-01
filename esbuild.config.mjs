import { copyFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { build } from "esbuild";

// Update locale files from docs markdown
execSync("tsx packages/localization/docs/build-help.ts", { stdio: "inherit" });

// Clean previous build
rmSync("./dist", { force: true, recursive: true });

const isProd = process.env.NODE_ENV === "production";

// Bundle the bot entry point. esbuild resolves all tsconfig path aliases
// (@dicelette/*, client, event, …) and inlines locale JSON imports.
// True npm dependencies are kept external via `packages: "external"`.
await build({
	bundle: true,
	define: {
		"process.env.NODE_ENV": `"${process.env.NODE_ENV || "development"}"`,
	},
	entryPoints: ["packages/bot/index.ts"],
	format: "esm",
	minify: false,
	minifyIdentifiers: false,
	minifySyntax: isProd,
	minifyWhitespace: false,
	outfile: "dist/packages/bot/index.js",
	packages: "external",
	platform: "node",
	sourcemap: !isProd,
	target: "esnext",
	tsconfig: "./tsconfig.json",
});

// Copy root package.json so dist/ is self-contained and Node.js
// treats the output as ESM ("type": "module").
copyFileSync("package.json", "dist/package.json");

console.log(
	`✅ Build ${isProd ? "production" : "development"} done`
);
