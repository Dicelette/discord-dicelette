import { important } from "@dicelette/utils";
import type { EClient } from "../client";

export const onWarn = (client: EClient): void => {
	client.on("warn", async (error) => {
		important.warn(error);
	});
};

export const onDebug = (client: EClient): void => {
	client.on("debug", async (message) => {
		important.debug(message);
	});
};
