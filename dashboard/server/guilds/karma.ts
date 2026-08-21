import type { Count, DBCount } from "@dicelette/types";
import {
	calculateServerStats,
	mapConcurrent,
	mergeCountDefaults,
	serverStats,
} from "@dicelette/utils";
import type { Request, Response } from "express";
import { Router } from "express";
import type { ApiKarmaEntry, DashboardDeps } from "../types";
import { isValidSnowflake, makeRequireGuildMember, requireAuth } from "../utils";

function sendNoStoreJson(res: Response, payload: unknown) {
	res.setHeader("Cache-Control", "no-store");
	res.json(payload);
}

/**
 * Concurrency cap for resolving Discord display names when listing karma
 * entries — mirrors the cap used for character owner-name resolution.
 */
const KARMA_FETCH_CONCURRENCY = 10;

async function resolveDisplayNames(
	userIds: string[],
	guildId: string,
	botGuilds: DashboardDeps["botGuilds"]
): Promise<Map<string, string | null>> {
	const guild = botGuilds.get(guildId);
	if (!guild) return new Map();
	const entries = await mapConcurrent(
		userIds,
		KARMA_FETCH_CONCURRENCY,
		async (userId) => {
			const name = await guild.fetchMemberName(userId).catch(() => null);
			return [userId, name] as const;
		}
	);
	return new Map(entries);
}

export function createKarmaRouter(deps: DashboardDeps) {
	const { criticalCount, botGuilds } = deps;
	const router = Router({ mergeParams: true });
	const requireGuildMember = makeRequireGuildMember(botGuilds);

	// GET /:guildId/karma — the current user's karma, server-wide stats, and the
	// list of every user tracked in the karma DB (used for the dashboard's search).
	// Open to any guild member, matching the /karma bot command's own access level.
	router.get(
		"/",
		requireAuth,
		requireGuildMember,
		async (req: Request, res: Response) => {
			const guildId = req.params.guildId as string;
			const userId = req.auth!.userId;
			const guildCount: DBCount = criticalCount.get(guildId) ?? {};

			const trackedEntries = Object.entries(guildCount)
				.map(([uid, count]) => [uid, mergeCountDefaults(count)] as const)
				.filter(([, count]) => (count.total ?? 0) > 0);

			const names = await resolveDisplayNames(
				trackedEntries.map(([uid]) => uid),
				guildId,
				botGuilds
			);

			const users: ApiKarmaEntry[] = trackedEntries.map(([uid, count]) => ({
				userId: uid,
				displayName: names.get(uid) ?? null,
				count,
			}));

			const { rollTotal, totalCount, usersWithCounts } = calculateServerStats(guildCount);
			const { avg, percent } = serverStats(totalCount, rollTotal, usersWithCounts);

			const meRaw = guildCount[userId];
			const me: Count | null = meRaw ? mergeCountDefaults(meRaw) : null;

			sendNoStoreJson(res, {
				me,
				server: { rollTotal, usersWithCounts, totalCount, avg, percent },
				users,
			});
		}
	);

	// GET /:guildId/karma/public/:userId — public, read-only karma for a single
	// user, for a shareable profile link. No auth, mirrors the characters/public route.
	router.get("/public/:userId", async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.params.userId as string;
		if (!isValidSnowflake(userId)) {
			res.status(400).json({ error: "Invalid user ID" });
			return;
		}

		const guildCount: DBCount = criticalCount.get(guildId) ?? {};
		const raw = guildCount[userId];
		if (!raw) {
			res.status(404).json({ error: "No karma data" });
			return;
		}

		const count = mergeCountDefaults(raw);
		const guild = botGuilds.get(guildId);
		const displayName = (await guild?.fetchMemberName(userId).catch(() => null)) ?? null;

		sendNoStoreJson(res, { userId, displayName, count } satisfies ApiKarmaEntry);
	});

	return router;
}
