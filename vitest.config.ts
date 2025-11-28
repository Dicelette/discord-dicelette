import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		alias: {
			"@dicelette/types": path.resolve(__dirname, "packages/types/index.ts"),
			"@dicelette/utils": path.resolve(__dirname, "packages/utils/index.ts"),
		},
		exclude: [],
		projects: ["packages/*"],
	},
});
