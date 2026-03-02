// esbuild.config.mjs
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import * as path from "node:path";
import { loadEnvFile } from "node:process";
import { build } from "esbuild";
import { fixImportsPlugin, writeFilePlugin } from "esbuild-fix-imports-plugin";
import { glob } from "glob";

loadEnvFile(".env");
rmSync("./dist", { force: true, recursive: true });

const isProd = process.env.NODE_ENV === "production";

// Trouve tous les fichiers .ts dans packages/ (transpilation pure)
const entryPoints = await glob("packages/**/*.ts", {
	ignore: ["packages/**/*.d.ts"], // Ignore les fichiers de déclaration
});

const aliasPlugin = {
	name: "alias-plugin",
	setup(build) {
		build.onResolve({ filter: /^discord_ext$/ }, (args) => {
			return {
				path: path.resolve("./packages/bot/src/discord_ext.ts"),
			};
		});
	},
};

await build({
	bundle: false, // Pas de bundling, juste de la transpilation
	define: {
		"process.env.NODE_ENV": `"${process.env.NODE_ENV || "development"}"`,
	},
	entryPoints,
	format: "esm",
	minify: false,
	outbase: "packages",
	outdir: "dist/packages",
	platform: "node",
	plugins: [fixImportsPlugin(), writeFilePlugin(), aliasPlugin],
	sourcemap: !isProd,
	sourceRoot: "packages",
	target: "esnext",
	tsconfig: "./tsconfig.json",
	write: false,
	minifySyntax: false,
	minifyWhitespace: false,
	minifyIdentifiers: false,
});

copyFileSync("package.json", "dist/package.json");

mkdirSync("dist/packages/localization/locales", { recursive: true });
const localeFiles = await glob("packages/localization/locales/*.json", {
	windowsPathsNoEscape: true,
});
for (const file of localeFiles) {
	const destFile = path.normalize(file.replace("packages", "dist/packages"));
	//fix path for windows
	copyFileSync(file, destFile);
	console.log(`Copy: ${file} -> ${destFile}`);
}

console.log(
	`✅ Build ${isProd ? "production" : "development"} done ${isProd ? " (without logging)" : ""}`
);
