import type {
	Characters,
	Settings,
	UserData,
	UserDatabase,
	UserGuildData,
} from "@dicelette/types";
import { important } from "@dicelette/utils";
import type { Request, Response } from "express";
import { Router } from "express";
import * as Papa from "papaparse";
import {
	type ApiCharacter,
	type BotChannels,
	CHAR_CACHE_TTL,
	charCache,
	type DashboardDeps,
	type EmbedField,
} from "../types";
import {
	fetchCharacterEmbeds,
	isStaleDiscordCdnUrl,
	makeRequireAdmin,
	requireAuth,
	userCanRefreshServerCharacters,
	withTimeout,
} from "../utils";
import { sendDashboardLog } from "./logs";

function isAllowSelfRegister(guildData: {
	allowSelfRegister?: boolean | string;
}): boolean {
	return guildData.allowSelfRegister === true || guildData.allowSelfRegister === "true";
}

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

async function resolveCharacterData(
	charName: string | null | undefined,
	messageId: string,
	channelId: string,
	memMaps: ReturnType<typeof buildMemMaps>,
	botChannels: BotChannels
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
	let stats: EmbedField[] | null = null;
	let damage: EmbedField[] | null = null;

	const hasStaleAvatar = isStaleDiscordCdnUrl(avatar);
	try {
		const fetched = await fetchCharacterEmbeds(channelId, messageId, botChannels);
		if (avatar === null || hasStaleAvatar) avatar = fetched.avatar;
		stats = fetched.stats;
		damage = fetched.damage;
	} catch (err) {
		important.warn(
			`[characters] embed unavailable for ${messageId}: ${err instanceof Error ? err.message : String(err)}`
		);
		// Only use memory as fallback if Discord fetch fails
		if (mem?.stats)
			stats = Object.entries(mem.stats).map(([name, value]) => ({
				name,
				value: String(value),
			}));
		if (mem?.damage)
			damage = Object.entries(mem.damage).map(([name, value]) => ({ name, value }));
	}

	return { avatar, stats, damage };
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

		const cached = charCache.get(cacheKey);
		if (cached && Date.now() - cached.ts < CHAR_CACHE_TTL) {
			res.setHeader("Cache-Control", "no-store");
			res.json(cached.data);
			return;
		}

		const guildData = settings.get(guildId);
		if (!guildData) {
			res.status(404).json({ error: "Guild not found" });
			return;
		}

		const userChars = guildData.user?.[userId] ?? [];
		const canLink = isAllowSelfRegister(guildData);

		// Lookup in the bot's in-memory cache (same process) — avoids Discord calls
		const memChars: UserData[] =
			(characters.get(guildId, userId) as UserData[] | undefined) ?? [];
		const memMaps = buildMemMaps(memChars);

		let result: ApiCharacter[];
		try {
			result = await withTimeout(
				Promise.all(
					userChars
						.filter((char) => {
							// Exclude characters from a template (not actually registered)
							const mem = memMaps.memByMessageId.get(char.messageId[0]);
							return !mem?.isFromTemplate;
						})
						.map(async (char) => {
							const [messageId, channelId] = char.messageId;
							const discordLink = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
							const { avatar, stats, damage } = await resolveCharacterData(
								char.charName,
								messageId,
								channelId,
								memMaps,
								botChannels
							);
							return {
								charName: char.charName ?? null,
								messageId,
								channelId,
								discordLink,
								canLink,
								isPrivate: char.isPrivate ?? false,
								avatar,
								stats,
								damage,
							};
						})
				),
				15_000
			);
		} catch (err) {
			if (err instanceof Error && err.message.startsWith("Timed out")) {
				res.status(504).json({ error: "Request timed out" });
				return;
			}
			throw err;
		}

		charCache.set(cacheKey, { data: result, ts: Date.now() });
		res.setHeader("Cache-Control", "no-store");
		res.json(result);
	});

	// POST /:guildId/characters/refresh — invalidates current player's cache
	router.post("/refresh", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		charCache.delete(`${guildId}:${userId}`);
		res.json({ ok: true });
	});

	// POST /:guildId/characters/refresh-dashboard — refresh player and server if GM/admin
	router.post("/refresh-dashboard", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		charCache.delete(`${guildId}:${userId}`);

		const canRefreshServer = await userCanRefreshServerCharacters(
			userId,
			guildId,
			botGuilds
		);
		if (canRefreshServer) {
			charCache.delete(`${guildId}:*all*`);
		}

		res.json({ ok: true, refreshedAll: canRefreshServer });
	});

	// GET /:guildId/characters/all — all character sheets on the server (admin only)
	router.get("/all", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const cacheKey = `${guildId}:*all*`;

		const cached = charCache.get(cacheKey);
		if (cached && Date.now() - cached.ts < CHAR_CACHE_TTL) {
			res.setHeader("Cache-Control", "no-store");
			res.json(cached.data);
			return;
		}

		const guildData = settings.get(guildId);
		if (!guildData) {
			res.status(404).json({ error: "Guild not found" });
			return;
		}

		const canLink = isAllowSelfRegister(guildData);
		const allUsers: Record<string, UserGuildData[]> = guildData.user ?? {};
		const allMemChars = (characters.get(guildId) as UserDatabase | undefined) ?? {};
		const guild = botGuilds.get(guildId);

		let result: ApiCharacter[];
		try {
			result = await withTimeout(
				(async () => {
					// Resolve Discord usernames of all players in one parallel pass
					const uniqueUserIds = Object.keys(allUsers);
					const nameEntries = await Promise.all(
						uniqueUserIds.map(async (uid) => {
							const name = await guild?.fetchMemberName(uid).catch(() => null);
							return [uid, name ?? null] as const;
						})
					);
					const ownerNames = new Map<string, string | null>(nameEntries);

					return Promise.all(
						Object.entries(allUsers).flatMap(([userId, userChars]) => {
							const memChars: UserData[] = allMemChars[userId] ?? [];
							const memMaps = buildMemMaps(memChars);
							const ownerName = ownerNames.get(userId) ?? undefined;

							return userChars
								.filter((char) => {
									const mem = memMaps.memByMessageId.get(char.messageId[0]);
									return !mem?.isFromTemplate;
								})
								.map(async (char): Promise<ApiCharacter> => {
									const [messageId, channelId] = char.messageId;
									const discordLink = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
									const { avatar, stats, damage } = await resolveCharacterData(
										char.charName,
										messageId,
										channelId,
										memMaps,
										botChannels
									);
									return {
										charName: char.charName ?? null,
										messageId,
										channelId,
										discordLink,
										canLink,
										isPrivate: char.isPrivate ?? false,
										avatar,
										stats,
										damage,
										userId,
										ownerName,
									};
								});
						})
					);
				})(),
				30_000
			);
		} catch (err) {
			if (err instanceof Error && err.message.startsWith("Timed out")) {
				res.status(504).json({ error: "Request timed out" });
				return;
			}
			throw err;
		}

		charCache.set(cacheKey, { data: result, ts: Date.now() });
		res.setHeader("Cache-Control", "no-store");
		res.json(result);
	});

	// POST /:guildId/characters/refresh-all — invalidates server cache (admin only)
	router.post(
		"/refresh-all",
		requireAuth,
		requireAdmin,
		(req: Request, res: Response) => {
			const guildId = req.params.guildId as string;
			charCache.delete(`${guildId}:*all*`);
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

			const guildData = settings.get(guildId);
			if (!guildData) {
				res.status(404).json({ error: "Guild not found" });
				return;
			}

			const statsName: string[] = guildData.templateID?.statsName ?? [];
			const hasPrivateChannel = !!guildData.privateChannel;
			const allUsers: Record<string, UserGuildData[]> = guildData.user ?? {};

			type CsvRow = Record<string, string | number | boolean | undefined>;
			const rows: CsvRow[] = [];

			for (const [uid, charList] of Object.entries(allUsers)) {
				const memChars = (characters.get(guildId, uid) as UserData[] | undefined) ?? [];
				const byName = new Map<string | null | undefined, UserData>(
					memChars.map((c) => [c.userName ?? null, c])
				);

				for (const char of charList) {
					const mem = byName.get(char.charName ?? null) ?? byName.get(null);
					const row: CsvRow = {
						user: `'${uid}`,
						charName: char.charName ?? undefined,
						avatar: mem?.avatar ?? undefined,
						channel: mem?.channel ? `'${mem.channel}` : undefined,
					};

					if (hasPrivateChannel) row.isPrivate = char.isPrivate ?? false;

					for (const name of statsName) {
						const normalized = name.toLowerCase().replace(/\s+/g, "_");
						row[name] = mem?.stats?.[normalized] ?? mem?.stats?.[name] ?? undefined;
					}

					if (mem?.damage && Object.keys(mem.damage).length > 0) {
						row.dice = `'${Object.entries(mem.damage)
							.map(([k, v]) => `- ${k}: ${v}`)
							.join("\n")}`;
					}

					rows.push(row);
				}
			}

			const columns = ["user", "charName", "avatar", "channel"];
			if (hasPrivateChannel) columns.push("isPrivate");
			if (statsName.length > 0) columns.push(...statsName);
			columns.push("dice");

			const csv = Papa.unparse(rows, {
				columns,
				delimiter: ";",
				header: true,
				quotes: false,
				skipEmptyLines: true,
			});

			// UTF-8 BOM for Excel
			const buf = Buffer.from(`\ufeff${csv}`, "utf-8");
			res.setHeader("Content-Type", "text/csv; charset=utf-8");
			res.setHeader("Content-Disposition", 'attachment; filename="characters.csv"');
			res.send(buf);
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
			for (const key of [...charCache.keys()]) {
				if (key.startsWith(`${guildId}:`)) charCache.delete(key);
			}

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
				const { csvText, channelId, overwrite } = req.body as {
					csvText: string;
					channelId: string;
					overwrite?: boolean;
				};

				if (!csvText || !channelId) {
					res.status(400).json({ error: "Missing csvText or channelId" });
					return;
				}

				const guildData = settings.get(guildId);
				if (!guildData) {
					res.status(404).json({ error: "Guild not found" });
					return;
				}

				const results = await parseCharactersCsv(
					csvText,
					guildId,
					channelId,
					overwrite ?? false,
					{ settings, characters, botChannels }
				);

				await sendDashboardLog(
					`[Dashboard] <@${userId}> imported ${results.success} character(s) via CSV (${results.failed} failed)`,
					guildId,
					settings,
					botChannels
				);

				// Invalidate caches
				charCache.delete(`${guildId}:*all*`);
				for (const key of [...charCache.keys()]) {
					if (key.startsWith(`${guildId}:`)) charCache.delete(key);
				}

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

async function parseCharactersCsv(
	csvText: string,
	guildId: string,
	channelId: string,
	overwrite: boolean,
	deps: { settings: Settings; characters: Characters; botChannels: BotChannels }
): Promise<{ success: number; failed: number; errors: string[] }> {
	const { settings, characters, botChannels } = deps;
	const guildData = settings.get(guildId);

	if (!guildData) throw new Error("Guild not found");

	const errors: string[] = [];
	let success = 0;
	let failed = 0;

	let csvData: Record<string, string | number | boolean | undefined>[] = [];
	await new Promise<void>((resolve) => {
		Papa.parse(csvText.replaceAll(/\s+;\s*/gi, ";"), {
			header: true,
			skipEmptyLines: true,
			complete(
				results: Papa.ParseResult<Record<string, string | number | boolean | undefined>>
			) {
				csvData = results.data;
				resolve();
			},
		});
	});

	const limiter = pLimit(3);

	const promises = csvData.map((row) =>
		limiter(async () => {
			try {
				const userId = row.user?.toString().replaceAll("'", "").trim();
				const charName = row.charName;
				const avatar = row.avatar;

				if (!userId) {
					errors.push("Row skipped: missing user ID");
					failed++;
					return;
				}

				const charNameStr = typeof charName === "string" ? charName : undefined;
				const avatarStr = typeof avatar === "string" ? avatar : undefined;

				// Create character data
				const userData: UserData = {
					userName: charNameStr ?? null,
					avatar: avatarStr || undefined,
					channel: channelId,
					template: {},
				};

				// Register in settings
				if (!guildData.user) guildData.user = {};
				if (!guildData.user[userId]) guildData.user[userId] = [];

				const userCharList = guildData.user[userId];

				// Check for duplicates unless overwrite
				const existing = userCharList.findIndex(
					(c: UserGuildData) =>
						c.charName === charNameStr || (!charNameStr && !c.charName)
				);

				if (existing !== -1 && !overwrite) {
					errors.push(`${charNameStr || "Default"} for user ${userId} already exists`);
					failed++;
					return;
				}

				// Create message placeholder
				const messageId = `import-${Date.now()}-${Math.random().toString(36).slice(2)}`;
				const isPrivateVal = row.isPrivate === true || row.isPrivate === "true";
				const charData: UserGuildData = {
					charName: charNameStr,
					messageId: [messageId, channelId],
					isPrivate: isPrivateVal,
				};

				if (existing !== -1) {
					userCharList[existing] = charData;
				} else {
					userCharList.push(charData);
				}

				// Register in memory cache
				if (!characters.has(guildId)) characters.set(guildId, {});
				if (!characters.has(guildId, userId))
					characters.set(guildId, [] as UserData[], userId);
				const memChars = characters.get(guildId, userId) as UserData[];
				memChars.push(userData);

				success++;
			} catch (err) {
				errors.push(err instanceof Error ? err.message : String(err));
				failed++;
			}
		})
	);

	await Promise.all(promises);
	settings.set(guildId, guildData);

	return { success, failed, errors };
}

function pLimit(concurrency: number) {
	let activeCount = 0;
	const queue: Array<() => void> = [];

	const next = () => {
		activeCount--;
		queue.shift()?.();
	};

	return async function limit<T>(fn: () => Promise<T>): Promise<T> {
		if (activeCount >= concurrency) {
			return new Promise<T>((resolve, reject) => {
				queue.push(() => {
					activeCount++;
					fn().then(resolve).catch(reject).finally(next);
				});
			});
		}
		activeCount++;
		try {
			return await fn();
		} finally {
			next();
		}
	};
}
