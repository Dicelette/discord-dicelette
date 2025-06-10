import { logger } from "@dicelette/utils";
import dotenv from "dotenv";
import "uniformize";
import process from "node:process";
import { important } from "@dicelette/utils";
import { client } from "client";
import {
	onDeleteChannel,
	onDeleteMessage,
	onDeleteThread,
	onError,
	onInteraction,
	onJoin,
	onKick,
	onMessageSend,
	onReactionAdd,
	onReactionRemove,
	ready,
	onDisconnect,
	sendErrorToWebhook,
} from "event";
import packageJson from "./package.json" with { type: "json" };

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });

process.on("unhandledRejection", async (reason) => {
	await sendErrorToWebhook(reason);
	console.log("EXITING DUE TO UNHANDLED REJECTION - PM2 WILL RESTART THE BOT");
	process.exit(1);
});

process.on("uncaughtException", async (err) => {
	await sendErrorToWebhook(err);
	console.log("EXITING DUE TO UNCAUGHT EXCEPTION - PM2 WILL RESTART THE BOT");
	process.exit(1);
});

important.info("Starting bot...");
//@ts-ignore
export const VERSION = packageJson.version ?? "/";
try {
	ready(client);
	onInteraction(client);
	onJoin(client);
	onMessageSend(client);
	onKick(client);
	onDeleteMessage(client);
	onDeleteChannel(client);
	onDeleteThread(client);
	onReactionAdd(client);
	onReactionRemove(client);
	onDisconnect(client);
	onError(client);
} catch (error) {
	logger.fatal(error);
}

client
	.login(process.env.DISCORD_TOKEN)
	.then(() => {
		important.info("Bot started");
	})
	.catch((error) => {
		logger.fatal(error);
	});
