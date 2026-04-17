import type { Request, Response } from "express";
import { Router } from "express";
import type { DashboardDeps } from "../types";
import { makeRequireAdmin, requireAuth } from "../utils";

export interface CharacterLog {
	id: string;
	timestamp: number;
	action: "import" | "edit" | "delete";
	userId: string;
	userName?: string;
	charName: string | null;
	messageId: string;
	details?: {
		fieldsModified?: string[];
		oldValues?: Record<string, unknown>;
		newValues?: Record<string, unknown>;
	};
}

const logsStorage = new Map<string, CharacterLog[]>();
const MAX_LOGS_PER_GUILD = 1000;

function addLog(guildId: string, log: CharacterLog) {
	if (!logsStorage.has(guildId)) {
		logsStorage.set(guildId, []);
	}
	const logs = logsStorage.get(guildId)!;
	logs.push(log);

	if (logs.length > MAX_LOGS_PER_GUILD) {
		logs.shift();
	}
}

export function createLogsRouter(deps: DashboardDeps) {
	const { botGuilds } = deps;
	const router = Router({ mergeParams: true });
	const requireAdmin = makeRequireAdmin(deps.botGuilds, deps.settings);

	// GET /:guildId/logs — get character import/edit logs (admin only)
	router.get("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const logs = logsStorage.get(guildId) ?? [];

		// Fetch member names for all unique user IDs
		const guild = botGuilds.get(guildId);
		const uniqueUserIds = [...new Set(logs.map((log) => log.userId))];
		const nameMap = new Map<string, string | null>();

		if (guild) {
			for (const userId of uniqueUserIds) {
				const name = await guild.fetchMemberName(userId).catch(() => null);
				nameMap.set(userId, name);
			}
		}

		const enrichedLogs = logs.map((log) => ({
			...log,
			userName: nameMap.get(log.userId) ?? log.userName,
		}));

		res.json({ logs: enrichedLogs });
	});

	// DELETE /:guildId/logs — clear all logs for a guild (admin only)
	router.delete("/", requireAuth, requireAdmin, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		logsStorage.delete(guildId);
		res.json({ ok: true });
	});

	return router;
}

export function logCharacterAction(
	guildId: string,
	userId: string,
	action: CharacterLog["action"],
	charName: string | null,
	messageId: string,
	details?: CharacterLog["details"]
) {
	addLog(guildId, {
		id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
		timestamp: Date.now(),
		action,
		userId,
		charName,
		messageId,
		details,
	});
}
