import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		alias: {
			"@dicelette/types": path.resolve(__dirname, "../types/index.ts"),
			"@dicelette/utils": path.resolve(__dirname, "../utils/index.ts"),
		},
		exclude: ["node_modules"],
		globals: true,
	},
});
