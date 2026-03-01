import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import * as path from "node:path";
import { build } from "esbuild";
import { glob } from "glob";

// Update locale files from docs markdown
execSync("tsx packages/localization/docs/build-help.ts", { stdio: "inherit" });

// Clean previous build
rmSync("./dist", { force: true, recursive: true });

const isProd = process.env.NODE_ENV === "production";

const entryPoints = await glob("packages/**/*.ts", {
	ignore: [
		"packages/**/*.d.ts",
		"packages/**/tests/**",
		"packages/**/*.test.ts",
		"packages/**/vitest.config.ts",
		"packages/localization/docs/**",
		"packages/**/node_modules/**",
	],
});

await build({
	bundle: false,
	define: {
		"process.env.NODE_ENV": `"${process.env.NODE_ENV || "development"}"`,
	},
	entryPoints,
	format: "esm",
	minify: false,
	minifyIdentifiers: false,
	minifySyntax: isProd,
	minifyWhitespace: false,
	outbase: ".",
	outdir: "dist",
	platform: "node",
	sourcemap: !isProd,
	target: "esnext",
	tsconfig: "./tsconfig.json",
});

// Fix path aliases (client, event, @dicelette/*, etc.) in compiled output
execSync("tsc-alias -p tsconfig.json", { stdio: "inherit" });

// Copy locale JSON files (esbuild does not copy non-TS assets)
const localesDir = "dist/packages/localization/locales";
mkdirSync(localesDir, { recursive: true });
const localeFiles = await glob("packages/localization/locales/*.json");
for (const file of localeFiles) {
	const destFile = path.join(localesDir, path.basename(file));
	copyFileSync(file, destFile);
	console.log(`Copy: ${file} -> ${destFile}`);
}

// Copy root package.json so version imports resolve at runtime
copyFileSync("package.json", "dist/package.json");

console.log(
	`✅ Build ${isProd ? "production" : "development"} done`
);
