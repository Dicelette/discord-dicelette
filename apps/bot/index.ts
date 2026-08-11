/** biome-ignore-all lint/suspicious/noTsIgnore: LET ME ALOOOOOOONE */
import { EventEmitter } from "node:events";
import process from "node:process";
import {
	humanizeDuration,
	important,
	logger,
	sentry,
	setupProcessErrorHandlers,
} from "@dicelette/utils";
import { client } from "client";
import dotenv from "dotenv";
import * as event from "event";
import express from "express";
import "uniformize";
import { startBotDashboard } from "./src/dashboard";
import { VERSION } from "./version";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env", quiet: true });
setupProcessErrorHandlers();

important.info("Starting bot...");
const guildEvents = new EventEmitter();

try {
	event.ready(client);
	event.onInteraction(client);
	event.onJoin(client, guildEvents);
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
	event.onMemberJoin(client);
	event.shardDebug(client);
} catch (error) {
	logger.fatal(error as Error);
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

if (process.env.DASHBOARD_ENABLED === "true") {
	logger.trace("Starting dashboard server...");
	startBotDashboard(client, guildEvents);
}

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
