/**
 * Export some dev template for testing purpose.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { StatisticalTemplate } from "@dicelette/core";
import type Enmap from "enmap";
import { logger } from "./logger";

const TESTING_DIRECTORY = "@testing";

export default function (template: Enmap<string, StatisticalTemplate, unknown>) {
	try {
		const allFiles = fs.readdirSync(TESTING_DIRECTORY);
		for (const file of allFiles) {
			if (file.endsWith(".json")) {
				const filePath = path.resolve(TESTING_DIRECTORY, file);
				const data = fs.readFileSync(filePath, "utf-8");
				//as we are in testing, we assume the given file is a valid json
				const json = JSON.parse(data) as StatisticalTemplate;
				const guildId = path.basename(filePath, ".json");
				logger.debug(`Loading guild: ${guildId}`);
				template.set(guildId, json);
			}
		}
	} catch (e) {
		logger.error("Error loading testing files: ", e);
	}
	return template;
}
