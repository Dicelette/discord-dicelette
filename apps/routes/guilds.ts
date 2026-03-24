import { type StatisticalTemplate, verifyTemplateValue } from "@dicelette/core";
import { validateAttributeEntry, validateSnippetEntry } from "@dicelette/helpers";
import type { GuildData, UserData } from "@dicelette/types";
import type { Request, Response } from "express";
import { Router } from "express";
import type { BotChannels, DashboardDeps } from ".";

// ---------------------------------------------------------------------------
// Character sheet cache: key = `${guildId}:${userId}`, TTL = 5 min
// ---------------------------------------------------------------------------
const CHAR_CACHE_TTL = 5 * 60 * 1000;
const charCache = new Map<string, { data: ApiCharacter[]; ts: number }>();

// ---------------------------------------------------------------------------
// Permission cache: key = `${userId}:${guildId}`, TTL = 5 min
// Avoids guild.fetchMember() (potentially an API call) on every request.
// ---------------------------------------------------------------------------
const PERM_CACHE_TTL = 5 * 60 * 1000;
const permCache = new Map<string, { result: boolean; expiresAt: number }>();

// Note: channelCache and roleCache have been removed — channels and roles are
// now read directly from the Discord.js in-memory client cache (zero API calls),
// so an additional TTL cache layer is unnecessary.

const DISCORD_API = "https://discord.com/api/v10";

interface EmbedField {
	name: string;
	value: string;
}
interface RawEmbed {
	title?: string;
	thumbnail?: { url: string };
	fields?: readonly EmbedField[];
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
	botChannels: BotChannels
): Promise<{
	avatar: string | null;
	stats: EmbedField[] | null;
	damage: EmbedField[] | null;
}> {
	const msg = await botChannels.fetchMessage(channelId, messageId);
	if (!msg) return { avatar: null, stats: null, damage: null };
	let avatar: string | null = null;
	let stats: EmbedField[] | null = null;
	let damage: EmbedField[] | null = null;
	for (const embed of msg.embeds) {
		const kind = classifyEmbed(embed);
		if (kind === "user" && embed.thumbnail?.url) avatar = embed.thumbnail.url;
		if (kind === "stats" && embed.fields?.length) stats = embed.fields as EmbedField[];
		if (kind === "damage" && embed.fields?.length) damage = embed.fields as EmbedField[];
	}
	return { avatar, stats, damage };
}

/** Discord snowflake: 17-20 digit numeric string */
const SNOWFLAKE_RE = /^\d{17,20}$/;

function isValidSnowflake(id: string): boolean {
	return SNOWFLAKE_RE.test(id);
}

function requireAuth(req: Request, res: Response, next: () => void) {
	if (!req.session?.userId) {
		res.status(401).json({ error: "Not authenticated" });
		return;
	}
	next();
}

/**
 * Check if a user can manage a guild using the Discord.js client cache.
 * Uses member.permissions (computed effective permissions) so no separate
 * roles API call is needed. Results are cached for 5 minutes to avoid
 * repeated guild.fetchMember() calls (which may hit the API for uncached members).
 */
async function userCanManageGuild(
	userId: string,
	guildId: string,
	botGuilds: DashboardDeps["botGuilds"]
): Promise<boolean> {
	const cacheKey = `${userId}:${guildId}`;
	const cached = permCache.get(cacheKey);
	if (cached && Date.now() < cached.expiresAt) return cached.result;

	const guild = botGuilds.get(guildId);
	if (!guild) {
		permCache.set(cacheKey, { result: false, expiresAt: Date.now() + PERM_CACHE_TTL });
		return false;
	}

	try {
		const member = await guild.fetchMember(userId);
		if (!member) {
			permCache.set(cacheKey, { result: false, expiresAt: Date.now() + PERM_CACHE_TTL });
			return false;
		}
		const ManageGuild = BigInt(0x20);
		const Administrator = BigInt(0x8);
		const result =
			member.hasPermission(ManageGuild) || member.hasPermission(Administrator);
		permCache.set(cacheKey, { result, expiresAt: Date.now() + PERM_CACHE_TTL });
		return result;
	} catch {
		return false;
	}
}

/**
 * Check if a user can manage a guild using their OAuth access token.
 * Used for guilds where the bot is not yet present (e.g. the /invite endpoint),
 * since the bot token cannot fetch members/roles from guilds it hasn't joined.
 * The permissions field returned by /users/@me/guilds encodes all effective
 * permissions for the user in that guild.
 */
async function userCanManageGuildViaOAuth(
	userId: string,
	guildId: string,
	accessToken: string
): Promise<boolean> {
	const cacheKey = `oauth:${userId}:${guildId}`;
	const cached = permCache.get(cacheKey);
	if (cached && Date.now() < cached.expiresAt) return cached.result;

	try {
		const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) {
			permCache.set(cacheKey, { result: false, expiresAt: Date.now() + PERM_CACHE_TTL });
			return false;
		}
		const guilds = (await res.json()) as Array<{
			id: string;
			owner: boolean;
			permissions: string;
		}>;
		const guild = guilds.find((g) => g.id === guildId);
		if (!guild) {
			permCache.set(cacheKey, { result: false, expiresAt: Date.now() + PERM_CACHE_TTL });
			return false;
		}
		const ManageGuild = BigInt(0x20);
		const Administrator = BigInt(0x8);
		const perms = BigInt(guild.permissions);
		const result =
			guild.owner ||
			(perms & ManageGuild) !== BigInt(0) ||
			(perms & Administrator) !== BigInt(0);
		permCache.set(cacheKey, { result, expiresAt: Date.now() + PERM_CACHE_TTL });
		return result;
	} catch {
		return false;
	}
}

export function createGuildRouter(deps: DashboardDeps) {
	const { settings, userSettings, template, characters, botGuilds, botChannels } = deps;
	const router = Router();

	// Validate guildId format for all /:guildId routes
	router.param("guildId", (_req, res, next, guildId) => {
		if (!isValidSnowflake(guildId)) {
			res.status(400).json({ error: "Invalid guild ID" });
			return;
		}
		next();
	});

	router.get("/:guildId/config", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		const config = settings.get(guildId);
		if (!config) {
			res.status(404).json({ error: "Guild not configured or bot not present" });
			return;
		}

		const canManage = await userCanManageGuild(userId, guildId, botGuilds);
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

		const canManage = await userCanManageGuild(userId, guildId, botGuilds);
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
		const userId = req.session.userId!;

		const canManage = await userCanManageGuild(userId, guildId, botGuilds);
		if (!canManage) {
			res.status(403).json({ error: "Insufficient permissions" });
			return;
		}

		const guild = botGuilds.get(guildId);
		if (!guild) {
			res.status(404).json({ error: "Guild not found or bot not present" });
			return;
		}

		// 0=text, 4=category, 5=announcement, 15=forum
		const filtered = guild.channels.filter((c) => [0, 4, 5, 15].includes(c.type));
		res.json(filtered);
	});

	router.get("/:guildId/roles", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		const canManage = await userCanManageGuild(userId, guildId, botGuilds);
		if (!canManage) {
			res.status(403).json({ error: "Insufficient permissions" });
			return;
		}

		const guild = botGuilds.get(guildId);
		if (!guild) {
			res.status(404).json({ error: "Guild not found or bot not present" });
			return;
		}

		// @everyone is already excluded by the botGuilds adapter
		res.json(guild.roles);
	});

	router.get("/:guildId/invite", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		const accessToken = req.session.accessToken!;

		// Use the user's OAuth token here: the bot is not yet in this guild so
		// the bot-token-based userCanManageGuild would always return false.
		const canManage = await userCanManageGuildViaOAuth(userId, guildId, accessToken);
		if (!canManage) {
			res.status(403).json({ error: "Insufficient permissions" });
			return;
		}

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

			if (type !== "snippets" && type !== "attributes") {
				res
					.status(400)
					.json({ error: "Invalid type: must be 'snippets' or 'attributes'" });
				return;
			}

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

			const isAdmin = await userCanManageGuild(userId, guildId, botGuilds);
			const userConfig = userSettings.get(guildId, userId) ?? null;

			res.json({ isAdmin, userConfig });
		}
	);

	// Update current user's personal settings for a guild (no admin required)
	router.patch("/:guildId/user-config", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		const { snippets, attributes, createLinkTemplate } = req.body as {
			snippets?: Record<string, unknown>;
			attributes?: Record<string, unknown>;
			createLinkTemplate?: unknown;
		};

		if (snippets !== undefined) {
			if (typeof snippets !== "object" || Array.isArray(snippets)) {
				res.status(400).json({ error: "Invalid snippets format" });
				return;
			}
			const currentAttrs = userSettings.get(guildId, userId)?.attributes;
			const errors: Record<string, string> = {};
			const valid: Record<string, string | number> = {};
			for (const [name, value] of Object.entries(snippets)) {
				const result = validateSnippetEntry(value, currentAttrs);
				if (result.ok) valid[name] = result.value;
				else errors[name] = result.error;
			}
			if (Object.keys(errors).length > 0) {
				res.status(400).json({ errors });
				return;
			}
			userSettings.set(guildId, valid, `${userId}.snippets`);
		}

		if (attributes !== undefined) {
			if (typeof attributes !== "object" || Array.isArray(attributes)) {
				res.status(400).json({ error: "Invalid attributes format" });
				return;
			}
			const errors: Record<string, string> = {};
			const valid: Record<string, string | number> = {};
			for (const [name, value] of Object.entries(attributes)) {
				const result = validateAttributeEntry(name, value);
				if (result.ok) valid[name] = result.value;
				else errors[name] = result.error;
			}
			if (Object.keys(errors).length > 0) {
				res.status(400).json({ errors });
				return;
			}
			userSettings.set(guildId, valid, `${userId}.attributes`);
		}

		if (createLinkTemplate !== undefined)
			userSettings.set(guildId, createLinkTemplate, `${userId}.createLinkTemplate`);

		res.json({ ok: true });
	});

	// GET user's characters with their sheet data (cached)
	router.get("/:guildId/characters", requireAuth, async (req: Request, res: Response) => {
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

		// Build a lookup map from the in-memory characters DB (same process as the bot).
		// Keyed by messageId so we can skip the Discord API call when the data is already cached.
		const memChars: UserData[] = (characters.get(guildId, userId) as UserData[] | undefined) ?? [];
		const memByMessageId = new Map<string, UserData>(
			memChars.filter((c) => c.messageId).map((c) => [c.messageId!, c])
		);

		const result: ApiCharacter[] = await Promise.all(
			userChars.map(async (char) => {
				const [messageId, channelId] = char.messageId;
				const discordLink = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;

				const mem = memByMessageId.get(messageId);
				let avatar: string | null = null;
				let stats: EmbedField[] | null = null;
				let damage: EmbedField[] | null = null;

				if (mem) {
					// Serve directly from in-memory DB — no Discord API call needed
					avatar = mem.avatar ?? null;
					if (mem.stats) stats = Object.entries(mem.stats).map(([name, value]) => ({ name, value: String(value) }));
					if (mem.damage) damage = Object.entries(mem.damage).map(([name, value]) => ({ name, value }));
				} else {
					// Fallback: character not yet in memory (e.g. first load after bot restart)
					try {
						({ avatar, stats, damage } = await fetchCharacterEmbeds(
							channelId,
							messageId,
							botChannels
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

		charCache.set(cacheKey, { data: result, ts: Date.now() });
		res.json(result);
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

	// GET guild statistical template (admin only)
	router.get("/:guildId/template", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		const canManage = await userCanManageGuild(userId, guildId, botGuilds);
		if (!canManage) {
			res.status(403).json({ error: "Insufficient permissions" });
			return;
		}

		// Try in-memory cache first
		const cached = template.get(guildId);
		if (cached) {
			res.json(cached);
			return;
		}

		// Fall back to fetching the attachment from Discord
		const config = settings.get(guildId);
		if (!config?.templateID?.channelId || !config.templateID.messageId) {
			res.status(404).json({ error: "No template registered" });
			return;
		}

		try {
			const msg = await botChannels.fetchMessage(
				config.templateID.channelId,
				config.templateID.messageId
			);
			if (!msg) {
				res.status(404).json({ error: "Template message not found" });
				return;
			}
			const attachment = msg.attachments.find((a) => a.filename === "template.json");
			if (!attachment) {
				res.status(404).json({ error: "Template attachment not found" });
				return;
			}
			const templateData = await fetch(attachment.url).then((r) => r.json());
			res.json(templateData);
		} catch {
			res.status(500).json({ error: "Failed to fetch template" });
		}
	});

	// POST import / update guild statistical template (admin only)
	router.post("/:guildId/template", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		const canManage = await userCanManageGuild(userId, guildId, botGuilds);
		if (!canManage) {
			res.status(403).json({ error: "Insufficient permissions" });
			return;
		}

		const { template: templateBody } = req.body as { template: unknown };
		if (!templateBody || typeof templateBody !== "object") {
			res.status(400).json({ error: "Invalid template" });
			return;
		}

		let validated: StatisticalTemplate;
		try {
			validated = verifyTemplateValue(templateBody);
		} catch {
			res.status(400).json({ error: "Invalid template format" });
			return;
		}

		// Update in-memory cache
		template.set(guildId, validated);

		// Update settings metadata
		const current = settings.get(guildId);
		if (current) {
			const statsName = validated.statistics ? Object.keys(validated.statistics) : [];
			const excludedStats = validated.statistics
				? Object.keys(
						Object.fromEntries(
							Object.entries(validated.statistics).filter(([, v]) => v.exclude)
						)
					)
				: [];
			const damageName = validated.damage ? Object.keys(validated.damage) : [];
			current.templateID = {
				channelId: current.templateID?.channelId ?? "",
				messageId: current.templateID?.messageId ?? "",
				statsName,
				excludedStats,
				damageName,
				valid: true,
			};
			settings.set(guildId, current);
		}

		res.json({ ok: true });
	});

	// DELETE guild statistical template (admin only)
	router.delete(
		"/:guildId/template",
		requireAuth,
		async (req: Request, res: Response) => {
			const guildId = req.params.guildId as string;
			const userId = req.session.userId!;

			const canManage = await userCanManageGuild(userId, guildId, botGuilds);
			if (!canManage) {
				res.status(403).json({ error: "Insufficient permissions" });
				return;
			}

			template.delete(guildId);

			const current = settings.get(guildId);
			if (current) {
				current.templateID = undefined as unknown as GuildData["templateID"];
				settings.set(guildId, current);
			}

			res.json({ ok: true });
		}
	);

	return router;
}
