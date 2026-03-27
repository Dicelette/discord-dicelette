import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		alias: {
			"@dicelette/helpers": path.resolve(
				__dirname,
				"packages/helpers/index.ts"
			),
			"@dicelette/client": path.resolve(__dirname, "packages/client/index.ts"),
			"@dicelette/localization": path.resolve(
				__dirname,
				"packages/localization/index.ts"
			),
			"@dicelette/parse_result": path.resolve(
				__dirname,
				"packages/parse_result/index.ts"
			),
			"@dicelette/types": path.resolve(__dirname, "packages/types/index.ts"),
			"@dicelette/utils": path.resolve(__dirname, "packages/utils/index.ts"),
		},
		exclude: ["node_modules"],
		include: ["packages/**/tests/**/*.test.ts"],
	},
});
