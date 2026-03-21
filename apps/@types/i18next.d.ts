import type { resources } from "../localization";

declare module "i18next" {
	interface CustomTypeOptions {
		readonly resources: (typeof resources)["en"];
		readonly returnNull: false;
	}
}
