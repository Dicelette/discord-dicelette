import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		alias: {
			"@dicelette/types": new URL("../types/index.ts", import.meta.url).pathname,
			"@dicelette/utils": new URL("../utils/index.ts", import.meta.url).pathname,
		},
		exclude: ["node_modules"],
		globals: true,
	},
});
