import { configuration } from "./configuration";
import { exportData } from "./export";
import { bulkAdd, bulkAddTemplate } from "./import";
import { templateManager } from "./template";
export const ADMIN = [
	configuration,
	templateManager,
	bulkAdd,
	bulkAddTemplate,
	exportData,
];
