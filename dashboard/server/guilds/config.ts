import type { GuildData } from "@dicelette/types";
import type { Request, Response } from "express";
import { Router } from "express";
import { type DashboardDeps, permCache } from "../types";
import { makeRequireAdmin, requireAuth } from "../utils";

export function createConfigRouter(deps: DashboardDeps) {
	const { settings, botGuilds } = deps;
	const router = Router({ mergeParams: true });
	const requireAdmin = makeRequireAdmin(botGuilds, settings);

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
			"dashboardAccess",
		];

		const updates = req.body as Record<string, unknown>;

		// Only strict Administrators can modify dashboardAccess
		if ("dashboardAccess" in updates) {
			// Validate format: must be an array of strings (role IDs)
			if (
				updates.dashboardAccess != null &&
				(!Array.isArray(updates.dashboardAccess) ||
					!updates.dashboardAccess.every((id: unknown) => typeof id === "string"))
			) {
				res
					.status(400)
					.json({ error: "dashboardAccess must be an array of role ID strings" });
				return;
			}

			const guild = botGuilds.get(guildId);
			if (guild) {
				const member = await guild.fetchMember(req.session.userId!);
				const Administrator = BigInt(0x8);
				if (!member?.hasPermission(Administrator)) {
					res
						.status(403)
						.json({ error: "Only Administrators can modify dashboard access roles" });
					return;
				}
			}
		}

		const merged: GuildData = { ...current };

		for (const key of allowedKeys) {
			if (!(key in updates)) continue;
			const value = updates[key];
			if (
				value === undefined ||
				value === null ||
				(Array.isArray(value) && value.length === 0)
			) {
				delete merged[key];
			} else {
				(merged as Record<keyof GuildData, unknown>)[key] = value;
			}
		}

		settings.set(guildId, merged);

		// When dashboardAccess changes, invalidate permission cache for this guild
		// so access checks immediately reflect the new role list
		if ("dashboardAccess" in updates) {
			permCache.deleteGuild(guildId);
		}

		res.json({ ok: true });
	});

	return router;
}
