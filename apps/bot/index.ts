/** biome-ignore-all lint/suspicious/noTsIgnore: LET ME ALOOOOOOONE */
import process from "node:process";
import { startDashboardServer } from "@dicelette/dashboard";
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
import packageJson from "../../package.json" with { type: "json" };
import "uniformize";

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
export const PRIVATE_ID = (process.env.PRIVATE_ID ?? "453162143668371456")
	.split(",")
	.map((id) => id.trim());
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

if (process.env.DASHBOARD_ENABLED === "true") {
	logger.trace("Starting dashboard server...");
	startDashboardServer({
		settings: client.settings,
		userSettings: client.userSettings,
		template: client.template,
		botGuilds: {
			has: (id) => client.guilds.cache.has(id),
			get: (id) => {
				const guild = client.guilds.cache.get(id);
				if (!guild) return undefined;
				return {
					fetchMember: async (userId) => {
						try {
							// Check in-memory cache first (populated by GuildMembers intent),
							// fall back to API only if the member isn't cached yet.
							const m =
								guild.members.cache.get(userId) ??
								(await guild.members.fetch(userId));
							return {
								hasPermission: (flag: bigint) =>
									(m.permissions.bitfield & flag) !== 0n,
							};
						} catch {
							return null;
						}
					},
					get channels() {
						return [...guild.channels.cache.values()].map((c) => ({
							id: c.id,
							name: c.name,
							type: c.type as number,
						}));
					},
					get roles() {
						return [...guild.roles.cache.values()]
							.filter((r) => r.id !== guild.id) // exclude @everyone (id === guildId)
							.map((r) => ({ id: r.id, name: r.name, color: r.color }));
					},
				};
			},
		},
		botChannels: {
			fetchMessage: async (channelId, messageId) => {
				const channel = client.channels.cache.get(channelId);
				if (!channel || !channel.isTextBased()) return null;
				try {
					const msg =
						channel.messages.cache.get(messageId) ??
						(await channel.messages.fetch(messageId));
					return {
						embeds: msg.embeds.map((e) => ({
							title: e.title ?? undefined,
							thumbnail: e.thumbnail ? { url: e.thumbnail.url } : undefined,
							fields: e.fields as ReadonlyArray<{ name: string; value: string }>,
						})),
						attachments: [...msg.attachments.values()].map((a) => ({
							filename: a.name,
							url: a.url,
						})),
					};
				} catch {
					return null;
				}
			},
		},
	});
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
