import type { EClient } from "@dicelette/client";
import type { GuildData, UserSettingsData } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import express from "express";
import { getGuildConfig, getUserSettings, toGuildSummary } from "./utils";

function getUserId(req: express.Request) {
	const userId = req.query.userId ?? req.params.userId;
	return typeof userId === "string" ? userId : undefined;
}

async function getGuildMember(client: EClient, guildId: string, userId: string) {
	const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
	if (!guild) return { guild: null, member: null };
	try {
		const member = await guild.members.fetch(userId);
		return { guild, member };
	} catch {
		return { guild, member: null };
	}
}

export function createDashboardRouter(client: EClient) {
	const router = express.Router();

	router.get("/bootstrap", async (req, res) => {
		const userId = getUserId(req);
		if (!userId) return res.status(400).send("Missing userId query parameter.");

		const guildEntries = await Promise.all(
			client.guilds.cache.map(async (guild) => {
				const { member } = await getGuildMember(client, guild.id, userId);
				if (!member) return null;
				const summary = toGuildSummary(guild, member);
				const config = getGuildConfig(client, guild.id);
				const userSettings = getUserSettings(client, guild.id, userId);
				return {
					summary,
					config,
					userSettings,
				};
			})
		);

		const filtered = guildEntries.filter((entry) => entry !== null);
		const user = client.users.cache.get(userId) ?? (await client.users.fetch(userId));
		return res.json({
			user: {
				id: user.id,
				discordTag: user.tag,
				avatar: user.displayAvatarURL() || "🎲",
				connected: true,
			},
			guilds: filtered.map((entry) => entry.summary),
			configByGuild: Object.fromEntries(
				filtered.map((entry) => [entry.summary.id, entry.config])
			),
			userSettingsByGuild: Object.fromEntries(
				filtered.map((entry) => [
					entry.summary.id,
					{
						snippets: entry.userSettings.snippets ?? {},
						attributes: entry.userSettings.attributes ?? {},
					},
				])
			),
		});
	});

	router.put("/guilds/:guildId/config", async (req, res) => {
		const userId = getUserId(req);
		if (!userId) return res.status(400).send("Missing userId query parameter.");
		const { guild, member } = await getGuildMember(client, req.params.guildId, userId);
		if (!guild || !member) return res.status(404).send("Guild or member not found.");
		if (!member.permissions.has("ManageRoles")) return res.status(403).send("Forbidden.");
		const nextConfig = req.body as GuildData;
		client.settings.set(guild.id, nextConfig);
		logger.info({ guildId: guild.id, userId }, "Dashboard config saved in Enmap");
		return res.json({
			guild: toGuildSummary(guild, member),
			config: getGuildConfig(client, guild.id),
			userSettings: getUserSettings(client, guild.id, userId),
		});
	});

	router.put("/guilds/:guildId/user-settings/:userId", async (req, res) => {
		const sessionUserId = getUserId(req) ?? req.params.userId;
		const targetUserId = req.params.userId;
		if (sessionUserId !== targetUserId)
			return res.status(403).send("You can only update your own settings.");
		const { guild, member } = await getGuildMember(
			client,
			req.params.guildId,
			targetUserId
		);
		if (!guild || !member) return res.status(404).send("Guild or member not found.");
		const payload = req.body as Pick<UserSettingsData, "snippets" | "attributes">;
		const current = getUserSettings(client, guild.id, targetUserId);
		client.userSettings.set(guild.id, payload.snippets ?? {}, `${targetUserId}.snippets`);
		client.userSettings.set(
			guild.id,
			payload.attributes ?? {},
			`${targetUserId}.attributes`
		);
		logger.info(
			{ guildId: guild.id, userId: targetUserId },
			"Dashboard user settings saved in Enmap"
		);
		return res.json({
			guild: toGuildSummary(guild, member),
			config: getGuildConfig(client, guild.id),
			userSettings: {
				...current,
				snippets: payload.snippets ?? {},
				attributes: payload.attributes ?? {},
			},
		});
	});

	return router;
}
