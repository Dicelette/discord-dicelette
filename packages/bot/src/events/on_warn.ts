import { important, sentry } from "@dicelette/utils";
import type { EClient } from "../client";

export const onWarn = (client: EClient): void => {
	client.on("warn", async (error) => {
		console.warn(error);
		sentry.warn(error, { source: "discord-warn" });
	});
};

export const onDebug = (client: EClient): void => {
	client.on("debug", async (message) => {
		if (!message.includes("Heartbeat acknowledged, latency of")) {
			important.debug(message);
			sentry.debug(message, { source: "discord-debug" });
		}
	});
};
