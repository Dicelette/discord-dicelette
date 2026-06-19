import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

const Dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineProject({
	test: {
		alias: {
			"@dicelette/types": path.resolve(Dirname, "../types/index.ts"),
			"@dicelette/utils": path.resolve(Dirname, "../utils/index.ts"),
		},
		exclude: ["node_modules"],
		globals: true,
	},
});
