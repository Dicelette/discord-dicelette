import type { GuildData } from "@dicelette/types";
import type { Request, Response } from "express";
import { Router } from "express";
import type { DashboardDeps } from "../index.js";

const DISCORD_API = "https://discord.com/api/v10";

function requireAuth(req: Request, res: Response, next: () => void) {
	if (!req.session?.userId) {
		res.status(401).json({ error: "Not authenticated" });
		return;
	}
	next();
}

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

		const ManageGuild = BigInt(0x20);
		const Administrator = BigInt(0x8);

		for (const role of guildRoles) {
			if (role.id === guildId || member.roles.includes(role.id)) {
				const perms = BigInt(role.permissions);
				if ((perms & ManageGuild) !== BigInt(0) || (perms & Administrator) !== BigInt(0))
					return true;
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

	router.get("/:guildId/config", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
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

		const { user: _user, ...safeConfig } = config;
		res.json(safeConfig);
	});

	router.patch("/:guildId/config", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
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
				(merged as Record<keyof GuildData, unknown>)[key] = value;
			}
		}

		settings.set(guildId, merged);
		res.json({ ok: true });
	});

	router.get("/:guildId/channels", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
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
			// 0=text, 4=category, 5=announcement, 15=forum
		res.json(channels.filter((c) => [0, 4, 5, 15].includes(c.type)));
		} catch {
			res.status(500).json({ error: "Failed to fetch channels" });
		}
	});

	router.get("/:guildId/roles", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
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

	router.get("/:guildId/invite", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
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
