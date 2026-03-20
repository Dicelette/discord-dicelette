import { Router } from "express";
import type { Request, Response } from "express";
import type { DashboardDeps } from "../index.js";
import type { GuildData } from "@dicelette/types";

const DISCORD_API = "https://discord.com/api/v10";

/** Auth middleware */
function requireAuth(req: Request, res: Response, next: () => void) {
	if (!req.session?.userId) {
		res.status(401).json({ error: "Not authenticated" });
		return;
	}
	next();
}

/**
 * Check if user has MANAGE_GUILD or ADMINISTRATOR permission on this guild.
 */
async function userCanManageGuild(userId: string, guildId: string): Promise<boolean> {
	const botToken = process.env.DISCORD_TOKEN;
	if (!botToken) return false;

	try {
		const memberRes = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
			headers: { Authorization: `Bot ${botToken}` },
		});
		if (!memberRes.ok) return false;
		const member = (await memberRes.json()) as { roles: string[] };

		const rolesRes = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
			headers: { Authorization: `Bot ${botToken}` },
		});
		if (!rolesRes.ok) return false;
		const guildRoles = (await rolesRes.json()) as Array<{
			id: string;
			permissions: string;
		}>;

		const MANAGE_GUILD = BigInt(0x20);
		const ADMINISTRATOR = BigInt(0x8);

		for (const role of guildRoles) {
			if (role.id === guildId || member.roles.includes(role.id)) {
				const perms = BigInt(role.permissions);
				if ((perms & MANAGE_GUILD) !== BigInt(0) || (perms & ADMINISTRATOR) !== BigInt(0)) {
					return true;
				}
			}
		}
		return false;
	} catch {
		return false;
	}
}

export function createGuildRouter(deps: DashboardDeps) {
	const { settings, userSettings: _userSettings } = deps;
	const router = Router();

	/** GET /api/guilds/:guildId/config */
	router.get("/:guildId/config", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params["guildId"] as string;
		const userId = req.session.userId!;

		const config = settings.get(guildId);
		if (!config) {
			res.status(404).json({ error: "Guild not configured or bot not present" });
			return;
		}

		const canManage = await userCanManageGuild(userId, guildId);
		if (!canManage) {
			res.status(403).json({ error: "Insufficient permissions" });
			return;
		}

		// Don't expose the `user` field (contains private character data)
		const { user: _user, ...safeConfig } = config;
		res.json(safeConfig);
	});

	/** PATCH /api/guilds/:guildId/config */
	router.patch("/:guildId/config", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params["guildId"] as string;
		const userId = req.session.userId!;

		const canManage = await userCanManageGuild(userId, guildId);
		if (!canManage) {
			res.status(403).json({ error: "Insufficient permissions" });
			return;
		}

		const current = settings.get(guildId);
		if (!current) {
			res.status(404).json({ error: "Guild not found" });
			return;
		}

		const allowedKeys: Array<keyof GuildData> = [
			"lang",
			"logs",
			"rollChannel",
			"disableThread",
			"hiddenRoll",
			"managerId",
			"deleteAfter",
			"timestamp",
			"privateChannel",
			"autoRole",
			"context",
			"linkToLogs",
			"allowSelfRegister",
			"pity",
			"disableCompare",
			"sortOrder",
			"stripOOC",
			"createLinkTemplate",
		];

		const updates = req.body as Record<string, unknown>;
		const merged: GuildData = { ...current };

		for (const key of allowedKeys) {
			if (!(key in updates)) continue;
			const value = updates[key];
			if (value === undefined || value === null) {
				delete merged[key];
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(merged as any)[key] = value;
			}
		}

		settings.set(guildId, merged);
		res.json({ ok: true });
	});

	/** GET /api/guilds/:guildId/channels */
	router.get("/:guildId/channels", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params["guildId"] as string;
		const botToken = process.env.DISCORD_TOKEN;

		if (!botToken) {
			res.status(500).json({ error: "Bot token not configured" });
			return;
		}

		try {
			const r = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
				headers: { Authorization: `Bot ${botToken}` },
			});
			if (!r.ok) {
				res.status(r.status).json({ error: "Failed to fetch channels" });
				return;
			}
			const channels = (await r.json()) as Array<{
				id: string;
				name: string;
				type: number;
			}>;
			res.json(channels.filter((c) => c.type === 0 || c.type === 5));
		} catch {
			res.status(500).json({ error: "Failed to fetch channels" });
		}
	});

	/** GET /api/guilds/:guildId/roles */
	router.get("/:guildId/roles", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params["guildId"] as string;
		const botToken = process.env.DISCORD_TOKEN;

		if (!botToken) {
			res.status(500).json({ error: "Bot token not configured" });
			return;
		}

		try {
			const r = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
				headers: { Authorization: `Bot ${botToken}` },
			});
			if (!r.ok) {
				res.status(r.status).json({ error: "Failed to fetch roles" });
				return;
			}
			const allRoles = (await r.json()) as Array<{
				id: string;
				name: string;
				color: number;
			}>;
			res.json(allRoles.filter((r) => r.name !== "@everyone"));
		} catch {
			res.status(500).json({ error: "Failed to fetch roles" });
		}
	});

	/** GET /api/guilds/:guildId/invite */
	router.get("/:guildId/invite", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params["guildId"] as string;
		const clientId = process.env.DISCORD_CLIENT_ID;
		if (!clientId) {
			res.status(500).json({ error: "CLIENT_ID not configured" });
			return;
		}
		const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&guild_id=${guildId}&scope=bot+applications.commands&permissions=274878024768`;
		res.json({ url });
	});

	return router;
}
