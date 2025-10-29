import path from "node:path";
import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		alias: {
			"@dicelette/localization": path.resolve(__dirname, "../localization/index.ts"),
			"@dicelette/types": path.resolve(__dirname, "../types/index.ts"),
			"@dicelette/utils": path.resolve(__dirname, "../utils/index.ts"),
		},
		exclude: ["node_modules"],
	},
});
