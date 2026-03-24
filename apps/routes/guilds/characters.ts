import type { UserData } from "@dicelette/types";
import type { Request, Response } from "express";
import { Router } from "express";
import Papa from "papaparse";
import type { DashboardDeps } from "..";
import { CHAR_CACHE_TTL, charCache, type ApiCharacter, type EmbedField } from "./types";
import { fetchCharacterEmbeds, makeRequireAdmin, requireAuth } from "./utils";

export function createCharactersRouter(deps: DashboardDeps) {
	const { settings, characters, botGuilds, botChannels } = deps;
	const router = Router({ mergeParams: true });
	const requireAdmin = makeRequireAdmin(botGuilds);

	// GET /:guildId/characters — fiches du joueur courant (avec cache)
	router.get("/", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		const cacheKey = `${guildId}:${userId}`;

		const cached = charCache.get(cacheKey);
		if (cached && Date.now() - cached.ts < CHAR_CACHE_TTL) {
			res.json(cached.data);
			return;
		}

		const guildData = settings.get(guildId);
		if (!guildData) {
			res.status(404).json({ error: "Guild not found" });
			return;
		}

		const userChars = guildData.user?.[userId] ?? [];
		const canLink =
			guildData.allowSelfRegister === true || guildData.allowSelfRegister === "true";

		// Lookup dans le cache en mémoire du bot (même processus) — évite les appels Discord
		const memChars: UserData[] =
			(characters.get(guildId, userId) as UserData[] | undefined) ?? [];
		const memByMessageId = new Map<string, UserData>(
			memChars.filter((c) => c.messageId).map((c) => [c.messageId!, c])
		);

		const result: ApiCharacter[] = await Promise.all(
			userChars
				.filter((char) => {
					// Exclure les personnages issus d'un template (non enregistrés réellement)
					const mem = memByMessageId.get(char.messageId[0]);
					return !mem?.isFromTemplate;
				})
				.map(async (char) => {
					const [messageId, channelId] = char.messageId;
					const discordLink = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;

					const mem = memByMessageId.get(messageId);
					let avatar: string | null = null;
					let stats: EmbedField[] | null = null;
					let damage: EmbedField[] | null = null;

					if (mem) {
						// Données directement depuis la mémoire — aucun appel Discord
						avatar = mem.avatar ?? null;
						if (mem.stats)
							stats = Object.entries(mem.stats).map(([name, value]) => ({
								name,
								value: String(value),
							}));
						if (mem.damage)
							damage = Object.entries(mem.damage).map(([name, value]) => ({
								name,
								value,
							}));
					} else {
						// Fallback : personnage absent de la mémoire (ex. premier chargement après restart)
						try {
							({ avatar, stats, damage } = await fetchCharacterEmbeds(
								channelId,
								messageId,
								botChannels
							));
						} catch {
							// erreurs silencieuses
						}
					}

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
		);

		charCache.set(cacheKey, { data: result, ts: Date.now() });
		res.json(result);
	});

	// POST /:guildId/characters/refresh — invalide le cache du joueur courant
	router.post("/refresh", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		charCache.delete(`${guildId}:${userId}`);
		res.json({ ok: true });
	});

	// GET /:guildId/characters/count — nombre total de personnages du serveur (admin uniquement)
	router.get("/count", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const users = settings.get(guildId)?.user ?? {};
		const count = Object.values(users).reduce((sum, chars) => sum + chars.length, 0);
		res.json({ count });
	});

	// GET /:guildId/characters/export — export CSV de tous les personnages (admin uniquement)
	router.get("/export", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;

		const guildData = settings.get(guildId);
		if (!guildData) {
			res.status(404).json({ error: "Guild not found" });
			return;
		}

		const statsName: string[] = guildData.templateID?.statsName ?? [];
		const hasPrivateChannel = !!guildData.privateChannel;
		const allUsers = guildData.user ?? {};

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

		// BOM UTF-8 pour Excel
		const buf = Buffer.from(`\ufeff${csv}`, "utf-8");
		res.setHeader("Content-Type", "text/csv; charset=utf-8");
		res.setHeader("Content-Disposition", 'attachment; filename="characters.csv"');
		res.send(buf);
	});

	// POST /:guildId/characters/bulk-delete — supprime tous les personnages du serveur (admin uniquement)
	router.post(
		"/bulk-delete",
		requireAuth,
		requireAdmin,
		async (req: Request, res: Response) => {
			const guildId = req.params.guildId as string;

			const guildData = settings.get(guildId);
			const users = guildData?.user ?? {};

			// Supprime les messages Discord de chaque personnage (erreurs silencieuses)
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

			// Invalide le cache pour tous les utilisateurs du serveur
			for (const key of [...charCache.keys()]) {
				if (key.startsWith(`${guildId}:`)) charCache.delete(key);
			}

			res.json({ ok: true });
		}
	);

	return router;
}
