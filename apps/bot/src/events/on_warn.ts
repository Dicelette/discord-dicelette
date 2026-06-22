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
		const excludedKeys = ["Heartbeat acknowledged, latency of"];
		if (!excludedKeys.some((key) => message.includes(key))) {
			important.debug(message);
			//sentry.debug(message, { source: "discord-debug" });
		}
	});
};

export const shardDebug = (client: EClient): void => {
	client.on("shardError", async (shardId, message) => {
		important.error(`${shardId} has encountered an error: ${message}`);
		sentry.error(`${shardId} has encountered an error: ${message}`, {
			source: "discord-shardError",
		});
	});
};
