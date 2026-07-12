import path from "node:path";
import { loadEnvFile } from "node:process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

loadEnvFile(path.resolve(__dirname, "..", "..", ".env"));

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: [
			{
				find: "@dicelette/types",
				replacement: path.resolve(__dirname, "../../packages/types/index.ts"),
			},
			// Bare `@dicelette/localization` → its TS entry; subpath imports
			// (e.g. `/locales/en.json`) must keep resolving against the directory.
			{
				find: /^@dicelette\/localization$/,
				replacement: path.resolve(__dirname, "../../packages/localization/index.ts"),
			},
			{
				find: "@dicelette/localization",
				replacement: path.resolve(__dirname, "../../packages/localization"),
			},
			{
				find: "@dicelette/api",
				replacement: path.resolve(__dirname, "../../dashboard/api"),
			},
			{
				find: "@dicelette/parse_result",
				replacement: path.resolve(__dirname, "../../packages/parse_result/index.ts"),
			},
			// Browser shims for Node-only modules pulled in transitively by the
			// dice parsing/formatting code (see src/shims/*).
			// Pure, browser-safe submodules of @dicelette/utils (errors, regex):
			// resolved to the package source so the shim can re-export them with a
			// clean subpath import instead of a deep `../../../../` relative path.
			{
				find: /^@dicelette\/utils\/(.*)$/,
				replacement: path.resolve(__dirname, "../../packages/utils/src/$1"),
			},
			{
				find: /^@dicelette\/utils$/,
				replacement: path.resolve(__dirname, "./src/shims/dicelette-utils-browser.ts"),
			},
			{
				find: "discord.js",
				replacement: path.resolve(__dirname, "./src/shims/discord-js-browser.ts"),
			},
			// `@dicelette/types`'s constants.ts runs dotenv.config() / reads
			// node:process at load; neutralize both for the browser bundle.
			{
				find: /^dotenv$/,
				replacement: path.resolve(__dirname, "./src/shims/dotenv-browser.ts"),
			},
			{
				find: /^node:process$/,
				replacement: path.resolve(__dirname, "./src/shims/node-process-browser.ts"),
			},
			{ find: "@shared", replacement: path.resolve(__dirname, "./src/shared/index.ts") },
		],
	},
	optimizeDeps: {
		exclude: ["**/playwright-report/**"],
	},
	server: {
		watch: {
			ignored: [
				"**/node_modules/**",
				"**/dist/**",
				"**/build/**",
				"**/playwright-report/**",
			],
		},
		host: true,
		port: process.env.PORT ? Number(process.env.PORT) : 5173,
		proxy: {
			"/api": {
				target: "http://localhost:8091",
				changeOrigin: true,
				xfwd: true, // transmits X-Forwarded-Host → allows redirecting to the real IP
			},
		},
	},
	build: {
		chunkSizeWarningLimit: 10000,
		reportCompressedSize: false,
		minify: "oxc",
		rolldownOptions: {
			output: {
				manualChunks: (id) => {
					if (
						id.includes("react-dom") ||
						id.includes("react-router") ||
						id.includes("/react/")
					)
						return "react";
					if (id.includes("@mui/") || id.includes("@emotion/")) return "mui";
					if (
						id.includes("@dicelette/core") ||
						id.includes("packages/parse_result") ||
						id.includes("@dice-roller/")
					)
						return "dicelette";
				},
			},
		},
	},
});
