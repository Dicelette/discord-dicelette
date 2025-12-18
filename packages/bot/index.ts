/** biome-ignore-all lint/suspicious/noTsIgnore: LET ME ALOOOOOOONE */
import { humanizeDuration, logger, sentry } from "@dicelette/utils";
import dotenv from "dotenv";
import "uniformize";
import process from "node:process";
import { important, setupProcessErrorHandlers } from "@dicelette/utils";
import { client } from "client";
import * as event from "event";
import express from "express";
import packageJson from "./package.json" with { type: "json" };

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env", quiet: true });
setupProcessErrorHandlers();
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
	if (process.env.NODE_ENV === "development") event.onDebug(client);
} catch (error) {
	logger.fatal(error);
	sentry.fatal("Failed to register bot events", { error });
}

const app = express();

app.get("/healthz", async (req, res) => {
	if (req.headers["get-status-only"] === "true") {
		if (client.ws.status === 0) res.status(200).send("OK");
		else res.status(500).send("NOT OK");
		return;
	}
	const status = {
		botConnected: client.ws.status === 0,
		guilds: client.guilds.cache.size,
		latency: client.ws.ping,
		uptime: humanizeDuration(process.uptime() * 1000),
		version: VERSION,
	};
	if (client.ws.status === 0) res.status(200).json(status);
	else res.status(500).json(status);
});

app.listen(process.env.PORT || 3000, () => {
	important.info(`Health check server is running on port ${process.env.PORT || 3000}`);
});

client
	.login(process.env.DISCORD_TOKEN)
	.then(() => {
		important.info("Bot started");
	})
	.catch((error) => {
		console.error(error);
		sentry.fatal("Failed to login bot", { error });
		process.exit(1);
	});
