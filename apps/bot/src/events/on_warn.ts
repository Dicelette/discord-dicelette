import { important, logger } from "@dicelette/utils";
import type { EClient } from "../client";

export const onWarn = (client: EClient): void => {
	client.on("warn", async (message) => {
		logger.warn(message, { source: "discord-warn" });
	});
};

export const shardDebug = (client: EClient): void => {
	client.on("shardError", async (error, shardId) => {
		important.error(`Shard ${shardId} has encountered an error:`, error, {
			source: "discord-shardError",
		});
	});
};
