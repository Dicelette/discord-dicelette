import type { Request, Response } from "express";
import { Router } from "express";
import type { DashboardDeps } from "..";
import { makeRequireAdmin, requireAuth, userCanManageGuildViaOAuth } from "./utils";

export function createChannelsRouter(deps: DashboardDeps) {
	const { botGuilds } = deps;
	const router = Router({ mergeParams: true });
	const requireAdmin = makeRequireAdmin(botGuilds);

	// GET /:guildId/channels
	router.get(
		"/channels",
		requireAuth,
		requireAdmin,
		async (req: Request, res: Response) => {
			const guildId = req.params.guildId as string;

			const guild = botGuilds.get(guildId);
			if (!guild) {
				res.status(404).json({ error: "Guild not found or bot not present" });
				return;
			}

			// 0=text, 4=category, 5=announcement, 10=announcement thread,
			// 11=public thread, 12=private thread, 15=forum
			const filtered = guild.channels.filter((c) =>
				[0, 4, 5, 10, 11, 12, 15].includes(c.type)
			);
			res.json(filtered);
		}
	);

	// GET /:guildId/roles
	router.get("/roles", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;

		const guild = botGuilds.get(guildId);
		if (!guild) {
			res.status(404).json({ error: "Guild not found or bot not present" });
			return;
		}

		// @everyone est déjà exclu par l'adaptateur botGuilds
		res.json(guild.roles);
	});

	// GET /:guildId/invite
	// Utilise le token OAuth de l'utilisateur car le bot n'est pas encore dans ce serveur.
	router.get("/invite", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		const accessToken = req.session.accessToken!;

		const canManage = await userCanManageGuildViaOAuth(userId, guildId, accessToken);
		if (!canManage) {
			res.status(403).json({ error: "Insufficient permissions" });
			return;
		}

		const clientId = process.env.DISCORD_CLIENT_ID ?? process.env.CLIENT_ID;
		if (!clientId) {
			res.status(500).json({ error: "CLIENT_ID not configured" });
			return;
		}
		const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&guild_id=${guildId}&scope=bot+applications.commands&permissions=274878024768`;
		res.json({ url });
	});

	return router;
}
