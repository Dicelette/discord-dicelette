import type { Request, Response } from "express";
import { Router } from "express";
import type { DashboardDeps } from "../types";
import { requireAuth, sendEtaggedJson, userCanManageGuild } from "../utils";

const Administrator = BigInt(0x8);

export function createBootstrapRouter(deps: DashboardDeps) {
	const { settings, userSettings, botGuilds } = deps;
	const router = Router({ mergeParams: true });

	router.get("/dashboard-bootstrap", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		const isAdmin = await userCanManageGuild(userId, guildId, botGuilds, settings);
		const userConfig = userSettings.get(guildId, userId) ?? null;
		const userCharCount = (settings.get(guildId)?.user?.[userId] ?? []).length;

		let isStrictAdmin = false;
		const guild = botGuilds.get(guildId);
		const guildName = guild?.name ?? null;
		const guildIcon = guild?.icon ?? null;
		if (guild) {
			try {
				const member = await guild.fetchMember(userId);
				if (member) {
					isStrictAdmin = member.hasPermission(Administrator);
				}
			} catch {
				// Keep default false
			}
		}

		if (!isAdmin) {
			sendEtaggedJson(req, res, {
				isAdmin,
				isStrictAdmin,
				userConfig,
				userCharCount,
				serverCharCount: 0,
				config: null,
				channels: [],
				roles: [],
				guildName,
				guildIcon,
			});
			return;
		}

		const guildConfig = settings.get(guildId);
		if (!guildConfig) {
			res.status(404).json({ error: "Guild not configured or bot not present" });
			return;
		}

		const { user: _user, ...safeConfig } = guildConfig;
		const users = guildConfig.user ?? {};
		const serverCharCount = Object.values(users).reduce(
			(sum, chars) => sum + chars.length,
			0
		);
		const channels =
			guild?.channels.filter((c) => [0, 4, 5, 10, 11, 12, 15].includes(c.type)) ?? [];
		const roles = guild?.roles ?? [];

		sendEtaggedJson(req, res, {
			isAdmin,
			isStrictAdmin,
			userConfig,
			userCharCount,
			serverCharCount,
			config: safeConfig,
			channels,
			roles,
			guildName,
			guildIcon,
		});
	});

	return router;
}
