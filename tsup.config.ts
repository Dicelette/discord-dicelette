// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["./packages/bot/index.ts"], // Point d'entrée principal
	outDir: "./packages/dist", // Répertoire de sortie
	format: ["esm"], // Formats de sortie
	bundle: true, // Activer le bundling pour obtenir un seul fichier
	splitting: true, // Désactiver le code splitting
	sourcemap: false, // Générer les sourcemaps
	dts: false, // Générer les déclarations TypeScript
	clean: true, // Nettoyer le répertoire de sortie
	treeshake: true, // Activer le treeshaking
	minify: true, // Minifier le code
	tsconfig: "tsconfig.dev.json", // Chemin vers votre tsconfig
	external: ["fs", "path", "enmap", ...require("node:module").builtinModules], // Inclure toutes les dépendances dans le bundle
	esbuildOptions(options) {
		options.platform = "node";
		options.target = "esnext";
		options.banner = {
			js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);import { fileURLToPath } from 'url';import path from 'path';const __filename = fileURLToPath(import.meta.url);const __dirname = path.dirname(__filename);`,
		};
	},
});
