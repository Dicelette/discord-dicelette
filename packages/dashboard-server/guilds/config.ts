import type { GuildData } from "@dicelette/types";
import type { Request, Response } from "express";
import { Router } from "express";
import type { DashboardDeps } from "..";
import { makeRequireAdmin, requireAuth } from "../utils";

export function createConfigRouter(deps: DashboardDeps) {
	const { settings, botGuilds } = deps;
	const router = Router({ mergeParams: true });
	const requireAdmin = makeRequireAdmin(botGuilds);

	// GET /:guildId/config
	router.get("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;

		const config = settings.get(guildId);
		if (!config) {
			res.status(404).json({ error: "Guild not configured or bot not present" });
			return;
		}

		const { user: _user, ...safeConfig } = config;
		res.json(safeConfig);
	});

	// PATCH /:guildId/config
	router.patch("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;

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

	return router;
}
