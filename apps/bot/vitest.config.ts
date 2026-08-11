import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

const Dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineProject({
	root: Dirname,
	test: {
		alias: {
			"@dicelette/client": path.resolve(Dirname, "../../packages/client/index.ts"),
			"@dicelette/discord_ext": path.resolve(
				Dirname,
				"../../packages/localization/src/discord_ext.ts"
			),
			"@dicelette/helpers": path.resolve(Dirname, "../../packages/helpers/index.ts"),
			"@dicelette/localization": path.resolve(
				Dirname,
				"../../packages/localization/index.ts"
			),
			"@dicelette/parse_result": path.resolve(
				Dirname,
				"../../packages/parse_result/index.ts"
			),
			"@dicelette/types": path.resolve(Dirname, "../../packages/types/index.ts"),
			"@dicelette/utils": path.resolve(Dirname, "../../packages/utils/index.ts"),
			client: path.resolve(Dirname, "src/client.ts"),
			commands: path.resolve(Dirname, "src/commands/index.ts"),
			database: path.resolve(Dirname, "src/database/index.ts"),
			event: path.resolve(Dirname, "src/events/index.ts"),
			features: path.resolve(Dirname, "src/features/index.ts"),
			locales: path.resolve(Dirname, "src/locales.ts"),
			messages: path.resolve(Dirname, "src/messages/index.ts"),
			utils: path.resolve(Dirname, "src/utils/index.ts"),
		},
		include: ["tests/**/*.test.ts"],
		exclude: ["node_modules"],
		globals: true,
	},
});
