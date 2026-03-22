import { validateAttributeEntry, validateSnippetEntry } from "@dicelette/helpers";
import type { GuildData } from "@dicelette/types";
import type { Request, Response } from "express";
import { Router } from "express";
import type { DashboardDeps } from "../index.js";

// ---------------------------------------------------------------------------
// Character sheet cache: key = `${guildId}:${userId}`, TTL = 5 min
// ---------------------------------------------------------------------------
const CHAR_CACHE_TTL = 5 * 60 * 1000;
const charCache = new Map<string, { data: ApiCharacter[]; ts: number }>();

interface EmbedField {
	name: string;
	value: string;
}
interface RawEmbed {
	title?: string;
	thumbnail?: { url: string };
	fields?: EmbedField[];
}
interface ApiCharacter {
	charName: string | null;
	messageId: string;
	channelId: string;
	discordLink: string;
	canLink: boolean;
	isPrivate: boolean;
	avatar: string | null;
	stats: EmbedField[] | null;
	damage: EmbedField[] | null;
}

const USER_EMBED_MARKERS = [
	"⌈⌋",
	"registration",
	"enregistrement",
	"registered player",
	"joueur enregistré",
];
const STATS_TITLES = ["statistic", "statistique", "statistics", "statistiques"];

function classifyEmbed(embed: RawEmbed): "user" | "stats" | "damage" | null {
	const title = (embed.title ?? "").toLowerCase();
	if (USER_EMBED_MARKERS.some((m) => title.includes(m.toLowerCase()))) return "user";
	if (STATS_TITLES.some((s) => title === s)) return "stats";
	if (title === "macro") return "damage";
	return null;
}

async function fetchCharacterEmbeds(
	channelId: string,
	messageId: string,
	botToken: string
): Promise<{
	avatar: string | null;
	stats: EmbedField[] | null;
	damage: EmbedField[] | null;
}> {
	const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages/${messageId}`, {
		headers: { Authorization: `Bot ${botToken}` },
	});
	if (!res.ok) return { avatar: null, stats: null, damage: null };
	const msg = (await res.json()) as { embeds?: RawEmbed[] };
	let avatar: string | null = null;
	let stats: EmbedField[] | null = null;
	let damage: EmbedField[] | null = null;
	for (const embed of msg.embeds ?? []) {
		const kind = classifyEmbed(embed);
		if (kind === "user" && embed.thumbnail?.url) avatar = embed.thumbnail.url;
		if (kind === "stats" && embed.fields?.length) stats = embed.fields;
		if (kind === "damage" && embed.fields?.length) damage = embed.fields;
	}
	return { avatar, stats, damage };
}

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
	const { settings, userSettings } = deps;
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

	// Validate snippets or attributes entries (no admin required)
	router.post(
		"/:guildId/validate-entries",
		requireAuth,
		(req: Request, res: Response) => {
			const guildId = req.params.guildId as string;
			const userId = req.session.userId!;
			const { type, entries } = req.body as {
				type: "snippets" | "attributes";
				entries: Record<string, unknown>;
			};

			if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
				res.status(400).json({ error: "Invalid entries format" });
				return;
			}

			const userAttrs = userSettings.get(guildId, userId)?.attributes;
			const valid: Record<string, string | number> = {};
			const errors: Record<string, string> = {};

			const validate =
				type === "attributes"
					? (name: string, value: unknown) => validateAttributeEntry(name, value)
					: (_name: string, value: unknown) => validateSnippetEntry(value, userAttrs);

			for (const [name, value] of Object.entries(entries)) {
				const result = validate(name, value);
				if (result.ok) valid[name] = result.value;
				else errors[name] = result.error;
			}

			res.json({ valid, errors });
		}
	);

	// Get current user's personal settings for a guild (no admin required)
	router.get(
		"/:guildId/user-config",
		requireAuth,
		async (req: Request, res: Response) => {
			const guildId = req.params.guildId as string;
			const userId = req.session.userId!;

			const isAdmin = await userCanManageGuild(userId, guildId);
			const userConfig = userSettings.get(guildId, userId) ?? null;

			res.json({ isAdmin, userConfig });
		}
	);

	// Update current user's personal settings for a guild (no admin required)
	router.patch("/:guildId/user-config", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		const { snippets, attributes, createLinkTemplate } = req.body as {
			snippets?: Record<string, string>;
			attributes?: Record<string, number>;
			createLinkTemplate?: unknown;
		};

		if (snippets !== undefined) userSettings.set(guildId, snippets, `${userId}.snippets`);
		if (attributes !== undefined)
			userSettings.set(guildId, attributes, `${userId}.attributes`);
		if (createLinkTemplate !== undefined)
			userSettings.set(guildId, createLinkTemplate, `${userId}.createLinkTemplate`);

		res.json({ ok: true });
	});

	// GET user's characters with their sheet data (cached)
	router.get("/:guildId/characters", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		const cacheKey = `${guildId}:${userId}`;
		const botToken = process.env.DISCORD_TOKEN;

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

		const characters: ApiCharacter[] = await Promise.all(
			userChars.map(async (char) => {
				const [messageId, channelId] = char.messageId;
				const discordLink = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
				let avatar: string | null = null;
				let stats: EmbedField[] | null = null;
				let damage: EmbedField[] | null = null;
				if (botToken) {
					try {
						({ avatar, stats, damage } = await fetchCharacterEmbeds(
							channelId,
							messageId,
							botToken
						));
					} catch {
						// silently ignore fetch errors
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

		charCache.set(cacheKey, { data: characters, ts: Date.now() });
		res.json(characters);
	});

	// Invalidate character cache for the current user (used by refresh button)
	router.post(
		"/:guildId/characters/refresh",
		requireAuth,
		(req: Request, res: Response) => {
			const guildId = req.params.guildId as string;
			const userId = req.session.userId!;
			charCache.delete(`${guildId}:${userId}`);
			res.json({ ok: true });
		}
	);

	return router;
}
