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
import {
	DISCORD_FETCH_CONCURRENCY,
	isValidSnowflake,
	makeRequireAdmin,
	makeRequireGuildMember,
	requireAuth,
	sendNoStoreJson,
} from "../utils";

interface MemberInfo {
	displayName: string | null;
	username: string | null;
	avatar: string | null;
}

async function resolveMemberInfo(
	userIds: string[],
	guildId: string,
	botGuilds: DashboardDeps["botGuilds"]
): Promise<Map<string, MemberInfo>> {
	const guild = botGuilds.get(guildId);
	if (!guild) return new Map();
	const entries = await mapConcurrent(
		userIds,
		DISCORD_FETCH_CONCURRENCY,
		async (userId) => {
			// Sequential, not Promise.all: both callbacks fall back to
			// guild.members.fetch(userId) when the member isn't cached yet, and
			// running them in parallel means both miss the cache and each fire
			// their own Discord API request. fetchMemberName's fetch populates
			// the cache, so fetchMemberAvatar's own cache check then hits it.
			const nameInfo = await guild.fetchMemberName(userId).catch(() => null);
			const avatar = await guild.fetchMemberAvatar(userId).catch(() => null);
			return [
				userId,
				{
					displayName: nameInfo?.displayName ?? null,
					username: nameInfo?.username ?? null,
					avatar,
				},
			] as const;
		}
	);
	return new Map(entries);
}

/**
 * Build the list of every tracked karma entry for a guild (userId, resolved
 * display name/avatar, and their Count) — shared by the authenticated
 * overview route and the public leaderboard route so both return the exact
 * same ranking data.
 */
async function buildUsersList(
	guildCount: DBCount,
	guildId: string,
	botGuilds: DashboardDeps["botGuilds"],
	extraUserIds: string[] = []
): Promise<{ users: ApiKarmaEntry[]; memberInfo: Map<string, MemberInfo> }> {
	const trackedEntries = Object.entries(guildCount)
		.map(([uid, count]) => [uid, mergeCountDefaults(count)] as const)
		.filter(([, count]) => (count.total ?? 0) > 0);

	const allUserIds = new Set(trackedEntries.map(([uid]) => uid));
	for (const uid of extraUserIds) allUserIds.add(uid);
	const memberInfo = await resolveMemberInfo([...allUserIds], guildId, botGuilds);

	// Drop entries whose member couldn't be resolved (left the server, etc.) —
	// an unnamed "Unknown player" row isn't actionable in any of the UIs that
	// consume this list (search, leaderboard, admin reset autocomplete).
	const users: ApiKarmaEntry[] = trackedEntries
		.map(([uid, count]) => ({
			userId: uid,
			displayName: memberInfo.get(uid)?.displayName ?? null,
			username: memberInfo.get(uid)?.username ?? null,
			avatar: memberInfo.get(uid)?.avatar ?? null,
			...count,
		}))
		.filter((entry) => entry.displayName !== null);

	return { users, memberInfo };
}

/**
 * Public, read-only leaderboard data (every tracked user's karma) for a
 * shareable leaderboard link. Shared by the `/public` route and the
 * share-link meta-tag injection (see `../meta.ts`).
 */
export async function getPublicLeaderboardUsers(
	guildId: string,
	deps: Pick<DashboardDeps, "criticalCount" | "botGuilds">
): Promise<ApiKarmaEntry[]> {
	const guildCount: DBCount = deps.criticalCount.get(guildId) ?? {};
	const { users } = await buildUsersList(guildCount, guildId, deps.botGuilds);
	return users;
}

/**
 * Public, read-only karma for a single user, for a shareable profile link.
 * Shared by the `/public/:userId` route and the share-link meta-tag
 * injection (see `../meta.ts`). Returns `null` when the user has no tracked
 * karma in this guild.
 */
export async function getPublicKarmaEntry(
	guildId: string,
	userId: string,
	deps: Pick<DashboardDeps, "criticalCount" | "botGuilds">
): Promise<ApiKarmaEntry | null> {
	const guildCount: DBCount = deps.criticalCount.get(guildId) ?? {};
	const raw = guildCount[userId];
	if (!raw) return null;

	const count = mergeCountDefaults(raw);
	const memberInfo = (await resolveMemberInfo([userId], guildId, deps.botGuilds)).get(
		userId
	);

	return {
		userId,
		displayName: memberInfo?.displayName ?? null,
		username: memberInfo?.username ?? null,
		avatar: memberInfo?.avatar ?? null,
		...count,
	} satisfies ApiKarmaEntry;
}

export function createKarmaRouter(deps: DashboardDeps) {
	const { criticalCount, botGuilds, settings } = deps;
	const router = Router({ mergeParams: true });
	const requireGuildMember = makeRequireGuildMember(botGuilds);
	const requireAdmin = makeRequireAdmin(botGuilds, settings);

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

			// Fetch the current user's info in the same batch even if they have
			// no tracked karma yet, so `meAvatar` still resolves.
			const { users, memberInfo } = await buildUsersList(guildCount, guildId, botGuilds, [
				userId,
			]);

			const { rollTotal, totalCount, usersWithCounts } = calculateServerStats(guildCount);
			const { avg, percent } = serverStats(totalCount, rollTotal, usersWithCounts);

			const meRaw = guildCount[userId];
			const me: Count | null = meRaw ? mergeCountDefaults(meRaw) : null;
			const meAvatar = memberInfo.get(userId)?.avatar ?? null;

			sendNoStoreJson(res, {
				me,
				meAvatar,
				server: { rollTotal, usersWithCounts, totalCount, avg, percent },
				users,
			});
		}
	);

	// GET /:guildId/karma/public — public, read-only leaderboard data (every
	// tracked user's karma) for a shareable leaderboard link. No auth, mirrors
	// the characters/public route; same data any authenticated guild member
	// can already see via the "/" route above.
	router.get("/public", async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const users = await getPublicLeaderboardUsers(guildId, deps);
		sendNoStoreJson(res, { users });
	});

	// GET /:guildId/karma/public/:userId — public, read-only karma for a single
	// user, for a shareable profile link. No auth, mirrors the characters/public route.
	router.get("/public/:userId", async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.params.userId as string;
		if (!isValidSnowflake(userId)) {
			res.status(400).json({ error: "Invalid user ID" });
			return;
		}

		const entry = await getPublicKarmaEntry(guildId, userId, deps);
		if (!entry) {
			res.status(404).json({ error: "No karma data" });
			return;
		}

		sendNoStoreJson(res, entry);
	});

	// POST /:guildId/karma/reset — resets the current user's own karma.
	router.post("/reset", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.auth!.userId;
		criticalCount.delete(guildId, userId);
		res.json({ ok: true });
	});

	// POST /:guildId/karma/reset/:userId — resets another user's karma (admin only).
	router.post(
		"/reset/:userId",
		requireAuth,
		requireAdmin,
		(req: Request, res: Response) => {
			const guildId = req.params.guildId as string;
			const userId = req.params.userId as string;
			if (!isValidSnowflake(userId)) {
				res.status(400).json({ error: "Invalid user ID" });
				return;
			}
			criticalCount.delete(guildId, userId);
			res.json({ ok: true });
		}
	);

	return router;
}
