import { configuration } from "./configuration";
import { exportData } from "./export";
import { bulkAdd, bulkAddTemplate } from "./import";
import { generateTemplate, registerTemplate } from "./template";
export const ADMIN = [
	configuration,
	generateTemplate,
	registerTemplate,
	bulkAdd,
	bulkAddTemplate,
	exportData,
];
