/** biome-ignore-all lint/suspicious/noTsIgnore: LET ME ALOOOOOOONE */
import { logger } from "@dicelette/utils";
import dotenv from "dotenv";
import "uniformize";
import process from "node:process";
import { important } from "@dicelette/utils";
import { client } from "client";
import * as event from "event";
import packageJson from "./package.json" with { type: "json" };

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });

process.on("unhandledRejection", async (reason) => {
	await event.sendErrorToWebhook(reason);
	console.error(reason);
	process.exit(1);
});

process.on("uncaughtException", async (err) => {
	await event.sendErrorToWebhook(err);
	console.error(err);
	process.exit(1);
});

important.info("Starting bot...");
//@ts-ignore
export const VERSION = packageJson.version ?? "/";
export const PRIVATE_ID = process.env.PRIVATE_ID ?? "453162143668371456";
try {
	event.ready(client);
	event.onInteraction(client);
	event.onJoin(client);
	event.onMessageSend(client);
	event.onKick(client);
	event.onDeleteMessage(client);
	event.onDeleteChannel(client);
	event.onDeleteThread(client);
	event.onReactionAdd(client);
	event.onReactionRemove(client);
	event.onUserQuit(client);
	event.onDisconnect(client);
	event.onError(client);
	event.onWarn(client);
	event.onDebug(client);
} catch (error) {
	logger.fatal(error);
}

client
	.login(process.env.DISCORD_TOKEN)
	.then(() => {
		important.info("Bot started");
	})
	.catch((error) => {
		console.error(error);
	});
