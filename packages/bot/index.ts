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
} from "event";
import packageJson from "./package.json" assert { type: "json" };

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });
console.log(`TOKEN: ${process.env.DISCORD_TOKEN}`);
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
