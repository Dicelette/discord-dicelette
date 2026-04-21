import { ln } from "@dicelette/localization";
import type { UserData, UserDatabase, UserGuildData } from "@dicelette/types";
import { important, mapConcurrent } from "@dicelette/utils";
import type { Request, Response } from "express";
import { Router } from "express";
import "uniformize";
import {
	type ApiCharacter,
	type BotChannels,
	charCache,
	charForceRefresh,
	type DashboardDeps,
	type EmbedField,
} from "../types";
import {
	fetchCharacterEmbeds,
	isStaleDiscordCdnUrl,
	makeRequireAdmin,
	requireAuth,
	userCanAccessChannel,
	userCanManageGuild,
	userCanRefreshServerCharacters,
	withTimeout,
} from "../utils";
import { sendDashboardLog } from "./logs";

function buildMemMaps(memChars: UserData[]) {
	const memByMessageId = new Map<string, UserData>(
		memChars.filter((c) => c.messageId).map((c) => [c.messageId!, c])
	);
	const memByUserName = new Map<string, UserData>(
		memChars.filter((c) => c.userName != null).map((c) => [c.userName!.toLowerCase(), c])
	);
	const memWithoutName = memChars.find((c) => c.userName == null);
	return { memByMessageId, memByUserName, memWithoutName };
}

function mapMemStats(mem?: UserData): EmbedField[] | null {
	if (!mem?.stats) return null;
	return Object.entries(mem.stats).map(([name, value]) => ({
		name,
		value: String(value),
	}));
}

function mapMemDamage(mem?: UserData): EmbedField[] | null {
	if (!mem?.damage) return null;
	return Object.entries(mem.damage).map(([name, value]) => ({ name, value }));
}

function sendNoStoreJson(res: Response, payload: unknown) {
	res.setHeader("Cache-Control", "no-store");
	res.json(payload);
}

function isTimeoutError(err: unknown): err is Error {
	return err instanceof Error && err.message.startsWith("Timed out");
}

async function resolveCharacterData(
	charName: string | null | undefined,
	messageId: string,
	channelId: string,
	memMaps: ReturnType<typeof buildMemMaps>,
	botChannels: BotChannels,
	forceRefresh = false
): Promise<{
	avatar: string | null;
	stats: EmbedField[] | null;
	damage: EmbedField[] | null;
}> {
	const { memByMessageId, memByUserName, memWithoutName } = memMaps;
	const mem =
		memByMessageId.get(messageId) ??
		memByUserName.get((charName ?? "").toLowerCase()) ??
		(charName == null ? memWithoutName : undefined);

	let avatar: string | null = mem?.avatar ?? null;
	let stats: EmbedField[] | null;
	let damage: EmbedField[] | null;

	const hasStaleAvatar = isStaleDiscordCdnUrl(avatar);
	try {
		const fetched = await fetchCharacterEmbeds(
			channelId,
			messageId,
			botChannels,
			forceRefresh
		);
		if (avatar === null || hasStaleAvatar) avatar = fetched.avatar;
		stats = fetched.stats ?? mapMemStats(mem);
		damage = fetched.damage ?? mapMemDamage(mem);
	} catch (err) {
		important.warn(
			`[characters] embed unavailable for ${messageId}: ${err instanceof Error ? err.message : String(err)}`
		);
		// Only use memory as fallback if Discord fetch fails
		stats = mapMemStats(mem);
		damage = mapMemDamage(mem);
	}

	return { avatar, stats, damage };
}

async function resolveCanLink(
	isAdmin: boolean,
	userId: string,
	guildId: string,
	channelId: string,
	botGuilds: DashboardDeps["botGuilds"]
): Promise<boolean> {
	return isAdmin || (await userCanAccessChannel(userId, guildId, channelId, botGuilds));
}

/**
 * Build a per-request memo that resolves canLink for a given channel once.
 * Two characters in the same channel would otherwise re-enter the permission
 * cache path (and incur the extra Map lookup / Date.now() per entry).
 */
function makeCanLinkMemo(
	isAdmin: boolean,
	userId: string,
	guildId: string,
	botGuilds: DashboardDeps["botGuilds"]
): (channelId: string) => Promise<boolean> {
	if (isAdmin) return () => Promise.resolve(true);
	const pending = new Map<string, Promise<boolean>>();
	return (channelId: string) => {
		let p = pending.get(channelId);
		if (!p) {
			p = resolveCanLink(isAdmin, userId, guildId, channelId, botGuilds);
			pending.set(channelId, p);
		}
		return p;
	};
}

/**
 * Concurrency cap for outgoing Discord API fan-out. Guild list + character
 * fetches happen on the hot path and must not saturate the bot's shared
 * Discord client with hundreds of parallel requests.
 */
const DISCORD_FETCH_CONCURRENCY = 10;

function invalidateGuildCharacterCache(guildId: string) {
	charCache.deleteGuild(guildId);
	charForceRefresh.deleteGuild(guildId);
}

export function createCharactersRouter(deps: DashboardDeps) {
	const { settings, characters, botGuilds, botChannels } = deps;
	const router = Router({ mergeParams: true });
	const requireAdmin = makeRequireAdmin(botGuilds, settings);

	// GET /:guildId/characters — current player's character sheets (with cache)
	router.get("/", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		const cacheKey = `${guildId}:${userId}`;
		const forceRefresh = charForceRefresh.delete(cacheKey);

		const cached = !forceRefresh ? charCache.get(cacheKey) : undefined;
		if (cached) {
			const isAdmin = await userCanManageGuild(userId, guildId, botGuilds, settings);
			const canLinkFor = makeCanLinkMemo(isAdmin, userId, guildId, botGuilds);
			const data = await Promise.all(
				cached.data.map(async (char) => ({
					...char,
					canLink: await canLinkFor(char.channelId),
				}))
			);
			sendNoStoreJson(res, data);
			return;
		}

		const guildData = settings.get(guildId);
		if (!guildData) {
			res.status(404).json({ error: "Guild not found" });
			return;
		}

		const userChars = guildData.user?.[userId] ?? [];
		const isAdmin = await userCanManageGuild(userId, guildId, botGuilds, settings);
		const canLinkFor = makeCanLinkMemo(isAdmin, userId, guildId, botGuilds);

		// Lookup in the bot's in-memory cache (same process) — avoids Discord calls
		const memChars: UserData[] =
			(characters.get(guildId, userId) as UserData[] | undefined) ?? [];
		const memMaps = buildMemMaps(memChars);

		const pending = userChars.filter((char) => {
			// Exclude characters from a template (not actually registered)
			const mem = memMaps.memByMessageId.get(char.messageId[0]);
			return !mem?.isFromTemplate;
		});

		let result: ApiCharacter[];
		try {
			result = await withTimeout(
				mapConcurrent(pending, DISCORD_FETCH_CONCURRENCY, async (char) => {
					const [messageId, channelId] = char.messageId;
					const discordLink = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
					const [canLink, data] = await Promise.all([
						canLinkFor(channelId),
						resolveCharacterData(
							char.charName,
							messageId,
							channelId,
							memMaps,
							botChannels,
							forceRefresh
						),
					]);
					return {
						charName: char.charName ?? null,
						messageId,
						channelId,
						discordLink,
						canLink,
						isPrivate: char.isPrivate ?? false,
						avatar: data.avatar,
						stats: data.stats,
						damage: data.damage,
					};
				}),
				15_000
			);
		} catch (err) {
			if (isTimeoutError(err)) {
				res.status(504).json({ error: "Request timed out" });
				return;
			}
			throw err;
		}

		charCache.set(cacheKey, { data: result, ts: Date.now() });
		sendNoStoreJson(res, result);
	});

	// POST /:guildId/characters/refresh — invalidates current player's cache
	router.post("/refresh", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		const cacheKey = `${guildId}:${userId}`;
		charCache.delete(cacheKey);
		charForceRefresh.add(cacheKey);
		res.json({ ok: true });
	});

	// POST /:guildId/characters/refresh-dashboard — refresh player and server if GM/admin
	router.post("/refresh-dashboard", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		const userCacheKey = `${guildId}:${userId}`;

		charCache.delete(userCacheKey);
		charForceRefresh.add(userCacheKey);

		const canRefreshServer = await userCanRefreshServerCharacters(
			userId,
			guildId,
			botGuilds
		);
		if (canRefreshServer) {
			invalidateGuildCharacterCache(guildId);
			charForceRefresh.add(`${guildId}:*all*`);
		}

		res.json({ ok: true, refreshedAll: canRefreshServer });
	});

	// GET /:guildId/characters/all — all character sheets on the server (admin only)
	// Supports ?limit=N&offset=M; slicing happens on the cached payload so that a
	// paginated caller doesn't force a full refetch.
	router.get("/all", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const cacheKey = `${guildId}:*all*`;
		const forceRefresh = charForceRefresh.delete(cacheKey);

		const parseBoundedInt = (raw: unknown, min: number, max: number): number | null => {
			if (typeof raw !== "string" || raw.length === 0) return null;
			const n = Number(raw);
			if (!Number.isInteger(n) || n < min || n > max) return null;
			return n;
		};
		const limit = parseBoundedInt(req.query.limit, 1, 500);
		const offset = parseBoundedInt(req.query.offset, 0, Number.MAX_SAFE_INTEGER) ?? 0;

		const respond = (data: ApiCharacter[]) => {
			if (limit == null && offset === 0) {
				sendNoStoreJson(res, data);
				return;
			}
			const total = data.length;
			const end = limit == null ? total : Math.min(total, offset + limit);
			sendNoStoreJson(res, {
				total,
				offset,
				limit: limit ?? total,
				items: data.slice(offset, end),
			});
		};

		const cached = !forceRefresh ? charCache.get(cacheKey) : undefined;
		if (cached) {
			respond(cached.data);
			return;
		}

		const guildData = settings.get(guildId);
		if (!guildData) {
			res.status(404).json({ error: "Guild not found" });
			return;
		}

		const allUsers: Record<string, UserGuildData[]> = guildData.user ?? {};
		const allMemChars = (characters.get(guildId) as UserDatabase | undefined) ?? {};
		const guild = botGuilds.get(guildId);

		let result: ApiCharacter[];
		try {
			result = await withTimeout(
				(async () => {
					const uniqueUserIds = Object.keys(allUsers);
					const nameEntries = await mapConcurrent(
						uniqueUserIds,
						DISCORD_FETCH_CONCURRENCY,
						async (uid) => {
							const name = await guild?.fetchMemberName(uid).catch(() => null);
							return [uid, name ?? null] as const;
						}
					);
					const ownerNames = new Map<string, string | null>(nameEntries);

					type Job = {
						userId: string;
						ownerName: string | undefined;
						memMaps: ReturnType<typeof buildMemMaps>;
						char: UserGuildData;
					};
					const jobs: Job[] = [];
					for (const [userId, userChars] of Object.entries(allUsers)) {
						const memChars: UserData[] = allMemChars[userId] ?? [];
						const memMaps = buildMemMaps(memChars);
						const ownerName = ownerNames.get(userId) ?? undefined;
						for (const char of userChars) {
							const mem = memMaps.memByMessageId.get(char.messageId[0]);
							if (mem?.isFromTemplate) continue;
							jobs.push({ userId, ownerName, memMaps, char });
						}
					}

					return mapConcurrent(
						jobs,
						DISCORD_FETCH_CONCURRENCY,
						async ({ userId, ownerName, memMaps, char }) => {
							const [messageId, channelId] = char.messageId;
							const discordLink = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
							const { avatar, stats, damage } = await resolveCharacterData(
								char.charName,
								messageId,
								channelId,
								memMaps,
								botChannels,
								forceRefresh
							);
							return {
								charName: char.charName ?? null,
								messageId,
								channelId,
								discordLink,
								canLink: true,
								isPrivate: char.isPrivate ?? false,
								avatar,
								stats,
								damage,
								userId,
								ownerName,
							} satisfies ApiCharacter;
						}
					);
				})(),
				30_000
			);
		} catch (err) {
			if (isTimeoutError(err)) {
				res.status(504).json({ error: "Request timed out" });
				return;
			}
			throw err;
		}

		charCache.set(cacheKey, { data: result, ts: Date.now() });
		respond(result);
	});

	// POST /:guildId/characters/refresh-all — invalidates server cache (admin only)
	router.post(
		"/refresh-all",
		requireAuth,
		requireAdmin,
		(req: Request, res: Response) => {
			const guildId = req.params.guildId as string;
			invalidateGuildCharacterCache(guildId);
			charForceRefresh.add(`${guildId}:*all*`);
			res.json({ ok: true });
		}
	);

	// GET /:guildId/characters/count — total number of characters on the server (admin only)
	router.get("/count", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const users: Record<string, UserGuildData[]> = settings.get(guildId)?.user ?? {};
		const count = Object.values(users).reduce((sum, chars) => sum + chars.length, 0);
		res.json({ count });
	});

	// GET /:guildId/characters/count-self — number of characters of current player (without admin rights)
	router.get("/count-self", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		const userChars: UserGuildData[] = settings.get(guildId)?.user?.[userId] ?? [];
		res.json({ count: userChars.length });
	});

	// GET /:guildId/characters/export — CSV export of all characters (admin only)
	router.get(
		"/export",
		requireAuth,
		requireAdmin,
		async (req: Request, res: Response) => {
			const guildId = req.params.guildId as string;

			try {
				// Delegate to bot's export logic (same as /export command)
				const buf = await botChannels.exportCharactersCsv(guildId);
				if (!buf) {
					res.status(404).json({ error: "No characters found" });
					return;
				}
				res.setHeader("Content-Type", "text/csv; charset=utf-8");
				res.setHeader("Content-Disposition", 'attachment; filename="characters.csv"');
				res.send(buf);
			} catch (error) {
				important.error("[export] error:", error);
				res.status(500).json({
					error: error instanceof Error ? error.message : "Export failed",
				});
			}
		}
	);

	// POST /:guildId/characters/bulk-delete — deletes all characters on the server (admin only)
	router.post(
		"/bulk-delete",
		requireAuth,
		requireAdmin,
		async (req: Request, res: Response) => {
			const guildId = req.params.guildId as string;

			const guildData = settings.get(guildId);
			const users: Record<string, UserGuildData[]> = guildData?.user ?? {};

			// Deletes Discord messages for each character (silent errors)
			const deletePromises: Promise<boolean>[] = [];
			for (const userData of Object.values(users)) {
				for (const char of userData) {
					const [messageId, channelId] = char.messageId;
					deletePromises.push(botChannels.deleteMessage(channelId, messageId));
				}
			}
			await Promise.allSettled(deletePromises);

			settings.delete(guildId, "user");
			characters.delete(guildId);

			// Invalidates cache for all server users
			invalidateGuildCharacterCache(guildId);

			res.json({ ok: true });
		}
	);

	// POST /:guildId/characters/import — import characters from CSV (admin only)
	router.post(
		"/import",
		requireAuth,
		requireAdmin,
		async (req: Request, res: Response) => {
			const guildId = req.params.guildId as string;
			const userId = req.session.userId!;

			try {
				const { csvText, deleteOldMessage } = req.body as {
					csvText: string;
					deleteOldMessage?: boolean;
				};

				if (!csvText) {
					res.status(400).json({ error: "Missing csvText" });
					return;
				}

				// Delegate fully to the bot — same logic as /import command
				const results = await botChannels.bulkImportCharacters(
					guildId,
					csvText,
					deleteOldMessage ?? false
				);
				const lang = (settings.get(guildId, "lang") ?? "en-US") as Parameters<
					typeof ln
				>[0];
				const ul = ln(lang);

				await sendDashboardLog(
					ul("characters.dashboardImportLog", {
						failed: results.failed,
						success: results.success,
						userId,
					}),
					guildId,
					settings,
					botChannels
				);

				// Invalidate caches
				invalidateGuildCharacterCache(guildId);

				res.json(results);
			} catch (error) {
				important.error("Import error:", error);
				res.status(500).json({
					error: error instanceof Error ? error.message : "Import failed",
				});
			}
		}
	);

	return router;
}
