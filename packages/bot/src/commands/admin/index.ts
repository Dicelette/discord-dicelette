import { configuration } from "./configuration";
import { exportData } from "./export";
import { bulkAdd, bulkAddTemplate } from "./import";
import { registerTemplate } from "./template";
export const ADMIN = [
	configuration,
	registerTemplate,
	bulkAdd,
	bulkAddTemplate,
	exportData,
];
