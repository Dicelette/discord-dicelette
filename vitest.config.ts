import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		silent: true,
		reporters: ["minimal"],
		alias: {
			"@dicelette/helpers": path.resolve(
				import.meta.dirname,
				"packages/helpers/index.ts"
			),
			"@dicelette/client": path.resolve(import.meta.dirname, "packages/client/index.ts"),
			"@dicelette/localization": path.resolve(
				import.meta.dirname,
				"packages/localization/index.ts"
			),
			"@dicelette/parse_result": path.resolve(
				import.meta.dirname,
				"packages/parse_result/index.ts"
			),
			"@dicelette/types": path.resolve(import.meta.dirname, "packages/types/index.ts"),
			"@dicelette/utils": path.resolve(import.meta.dirname, "packages/utils/index.ts"),
		},
		exclude: ["node_modules"],
		include: ["packages/**/tests/**/*.test.ts"],
	},
});
