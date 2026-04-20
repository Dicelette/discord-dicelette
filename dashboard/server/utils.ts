import { createHash } from "node:crypto";
import { findln } from "@dicelette/localization";
import type { Settings } from "@dicelette/types";
import type { Request, Response } from "express";
import {
	type BotChannels,
	type DashboardDeps,
	DISCORD_API,
	type EmbedField,
	PERM_CACHE_TTL,
	permCache,
	type RawEmbed,
	SNOWFLAKE_RE,
	STATS_TITLES,
	USER_EMBED_MARKERS,
} from "./types";

const ADMINISTRATOR = BigInt(0x8);
const MANAGE_GUILD = BigInt(0x20);
const MANAGE_ROLES = BigInt(0x10000000);
const USER_EMBED_KEYS = ["embed.user", "embed.add", "embed.old"] as const;
const STATS_EMBED_KEYS = ["common.statistic", "common.statistics"] as const;
const DAMAGE_EMBED_KEYS = ["embed.dice", "legacy.dice", "common.macro"] as const;
const USER_EMBED_MARKERS_LOWER = USER_EMBED_MARKERS.map((m) => m.toLowerCase());
const STATS_TITLES_LOWER = STATS_TITLES.map((s) => s.toLowerCase());

type EmbedKind = "user" | "stats" | "damage";
type EmbedTitleMeta = { title: string; titleKey: string };
type EmbedClassifier = { kind: EmbedKind; match: (meta: EmbedTitleMeta) => boolean };

function getEmbedTitleMeta(embed: RawEmbed): EmbedTitleMeta {
	const rawTitle = embed.title ?? "";
	return {
		title: rawTitle.toLowerCase(),
		titleKey: String(findln(rawTitle)).toLowerCase(),
	};
}

const EMBED_CLASSIFIERS: ReadonlyArray<EmbedClassifier> = [
	{
		kind: "user",
		match: ({ title, titleKey }) =>
			USER_EMBED_MARKERS_LOWER.some((marker) => title.includes(marker)) ||
			USER_EMBED_KEYS.includes(titleKey as (typeof USER_EMBED_KEYS)[number]),
	},
	{
		kind: "stats",
		match: ({ title, titleKey }) =>
			STATS_TITLES_LOWER.includes(title) ||
			STATS_EMBED_KEYS.includes(titleKey as (typeof STATS_EMBED_KEYS)[number]),
	},
	{
		kind: "damage",
		match: ({ title, titleKey }) =>
			title === "macro" ||
			title === "dice" ||
			DAMAGE_EMBED_KEYS.includes(titleKey as (typeof DAMAGE_EMBED_KEYS)[number]),
	},
];

function getCached(key: string): boolean | null {
	const cached = permCache.get(key);
	if (cached && Date.now() < cached.expiresAt) return cached.result;
	return null;
}

function setCached(key: string, result: boolean): boolean {
	permCache.set(key, { result, expiresAt: Date.now() + PERM_CACHE_TTL });
	return result;
}

/**
 * Détecte une URL Discord CDN dont les paramètres d'expiration ont été supprimés
 * par cleanAvatarUrl(). Ces URLs sont invalides car Discord requiert les params
 * ?ex=...&is=...&hm=... pour les fichiers attachés depuis 2023.
 */
export function isStaleDiscordCdnUrl(url: string | null): boolean {
	if (!url) return false;
	return /(cdn|media)\.discordapp\.(net|com)/i.test(url) && !url.includes("?");
}

/**
 * Run async tasks with a bounded concurrency. Keeps at most `limit` promises
 * in-flight at once — useful when fan-out would otherwise issue N parallel
 * Discord API calls and exhaust rate limits.
 */
export async function mapConcurrent<T, R>(
	items: readonly T[],
	limit: number,
	worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	if (items.length === 0) return [];
	const results: R[] = new Array(items.length);
	const effective = Math.max(1, Math.min(limit, items.length));
	let nextIndex = 0;
	const runners = Array.from({ length: effective }, async () => {
		while (true) {
			const i = nextIndex++;
			if (i >= items.length) return;
			results[i] = await worker(items[i], i);
		}
	});
	await Promise.all(runners);
	return results;
}

/** Wraps a promise with a hard timeout; rejects with an Error if not resolved in time. */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout>;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
	});
	try {
		return await Promise.race([promise, timeout]);
	} finally {
		clearTimeout(timer!);
	}
}

export function isValidSnowflake(id: string): boolean {
	return SNOWFLAKE_RE.test(id);
}

/**
 * Applique une fonction de validation à chaque entrée d'un objet et retourne
 * les résultats séparés en deux groupes : `valid` et `errors`.
 */
export function validateEntries(
	entries: Record<string, unknown>,
	validateFn: (
		name: string,
		value: unknown
	) => { ok: true; value: string | number } | { ok: false; error: string }
): { valid: Record<string, string | number>; errors: Record<string, string> } {
	const valid: Record<string, string | number> = {};
	const errors: Record<string, string> = {};
	for (const [name, value] of Object.entries(entries)) {
		const result = validateFn(name, value);
		if ("value" in result) {
			valid[name] = result.value;
		} else {
			errors[name] = result.error;
		}
	}
	return { valid, errors };
}

export function requireAuth(req: Request, res: Response, next: () => void) {
	if (!req.session?.userId) {
		res.status(401).json({ error: "Not authenticated" });
		return;
	}
	next();
}

/**
 * Middleware factory qui vérifie que l'utilisateur courant dispose des droits
 * « Manage Guild » ou « Administrator » via le cache Discord.js bot,
 * ou possède un des rôles listés dans `dashboardAccess` (si configuré).
 * À instancier une fois dans le router et à réutiliser sur les routes admin.
 */
export function makeRequireAdmin(
	botGuilds: DashboardDeps["botGuilds"],
	settings: Settings
) {
	return async (req: Request, res: Response, next: () => void) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		const canManage = await userCanManageGuild(userId, guildId, botGuilds, settings);
		if (!canManage) {
			res.status(403).json({ error: "Insufficient permissions" });
			return;
		}
		next();
	};
}

/**
 * Vérifie si un utilisateur peut gérer un serveur via le cache Discord.js du bot.
 *
 * Quand `dashboardAccess` est configuré (non-vide) dans les settings du serveur,
 * seuls les utilisateurs possédant l'un de ces rôles (ou la permission Administrator)
 * ont accès. La permission ManageGuild seule ne suffit plus.
 *
 * Sans `dashboardAccess`, le comportement par défaut est conservé :
 * ManageGuild ou Administrator.
 *
 * Les résultats sont mis en cache 5 minutes pour limiter les appels à
 * `guild.fetchMember()`.
 */
export async function userCanManageGuild(
	userId: string,
	guildId: string,
	botGuilds: DashboardDeps["botGuilds"],
	settings?: Settings
): Promise<boolean> {
	const cacheKey = `${userId}:${guildId}`;
	const hit = getCached(cacheKey);
	if (hit !== null) return hit;

	const guild = botGuilds.get(guildId);
	if (!guild) return setCached(cacheKey, false);

	try {
		const member = await guild.fetchMember(userId);
		if (!member) return setCached(cacheKey, false);

		// Administrator always has access regardless of dashboardAccess
		if (member.hasPermission(ADMINISTRATOR)) return setCached(cacheKey, true);

		const dashboardAccess = settings?.get(guildId, "dashboardAccess") as
			| string[]
			| undefined;

		let result: boolean;
		if (dashboardAccess && dashboardAccess.length > 0) {
			// When dashboardAccess is set, only users with one of those roles have access
			result = member.roleIds.some((roleId) => dashboardAccess.includes(roleId));
		} else {
			// Default: ManageGuild grants access
			result = member.hasPermission(MANAGE_GUILD);
		}

		return setCached(cacheKey, result);
	} catch {
		return false;
	}
}

/**
 * Vérifie si un utilisateur peut rafraîchir les fiches de tout le serveur.
 * Autorisé si l'utilisateur a au moins une permission parmi:
 * - Administrator
 * - Manage Guild
 * - Manage Roles
 */
export async function userCanRefreshServerCharacters(
	userId: string,
	guildId: string,
	botGuilds: DashboardDeps["botGuilds"]
): Promise<boolean> {
	const cacheKey = `refresh:${userId}:${guildId}`;
	const hit = getCached(cacheKey);
	if (hit !== null) return hit;

	const guild = botGuilds.get(guildId);
	if (!guild) return setCached(cacheKey, false);

	try {
		const member = await guild.fetchMember(userId);
		if (!member) return setCached(cacheKey, false);
		const result =
			member.hasPermission(ADMINISTRATOR) ||
			member.hasPermission(MANAGE_GUILD) ||
			member.hasPermission(MANAGE_ROLES);
		return setCached(cacheKey, result);
	} catch {
		return false;
	}
}

export async function userCanAccessChannel(
	userId: string,
	guildId: string,
	channelId: string,
	botGuilds: DashboardDeps["botGuilds"]
): Promise<boolean> {
	const cacheKey = `channel:${userId}:${guildId}:${channelId}`;
	const hit = getCached(cacheKey);
	if (hit !== null) return hit;

	const guild = botGuilds.get(guildId);
	if (!guild) return setCached(cacheKey, false);

	try {
		const result = await guild.memberCanAccessChannel(userId, channelId);
		return setCached(cacheKey, result);
	} catch {
		return false;
	}
}

/**
 * Vérifie si un utilisateur peut gérer un serveur via son token OAuth.
 * Utilisé pour les serveurs où le bot n'est pas encore présent (ex. /invite),
 * car le token bot ne peut pas récupérer les membres de serveurs non rejoints.
 */
export async function userCanManageGuildViaOAuth(
	userId: string,
	guildId: string,
	accessToken: string
): Promise<boolean> {
	const cacheKey = `oauth:${userId}:${guildId}`;
	const hit = getCached(cacheKey);
	if (hit !== null) return hit;

	try {
		const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) return setCached(cacheKey, false);
		const guilds = (await res.json()) as Array<{
			id: string;
			owner: boolean;
			permissions: string;
		}>;
		const guild = guilds.find((g) => g.id === guildId);
		if (!guild) return setCached(cacheKey, false);
		const perms = BigInt(guild.permissions);
		const result =
			guild.owner ||
			(perms & MANAGE_GUILD) !== BigInt(0) ||
			(perms & ADMINISTRATOR) !== BigInt(0);
		return setCached(cacheKey, result);
	} catch {
		return false;
	}
}

export function classifyEmbed(embed: RawEmbed): "user" | "stats" | "damage" | null {
	const meta = getEmbedTitleMeta(embed);
	for (const classifier of EMBED_CLASSIFIERS) {
		if (classifier.match(meta)) return classifier.kind;
	}
	return null;
}

export async function fetchCharacterEmbeds(
	channelId: string,
	messageId: string,
	botChannels: BotChannels,
	forceRefresh = false
): Promise<{
	avatar: string | null;
	stats: EmbedField[] | null;
	damage: EmbedField[] | null;
}> {
	const msg = await botChannels.fetchMessage(channelId, messageId, {
		force: forceRefresh,
	});
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

export function clientId() {
	return process.env.DISCORD_CLIENT_ID ?? process.env.CLIENT_ID;
}

export function clientSecret() {
	return process.env.DISCORD_CLIENT_SECRET ?? process.env.CLIENT_SECRET;
}

export function redirectUri() {
	return process.env.DISCORD_REDIRECT_URI ?? "http://localhost:3001/api/auth/callback";
}

export async function discordFetch(path: string, accessToken: string) {
	const res = await fetch(`${DISCORD_API}${path}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) throw new Error(`Discord API error: ${res.status}`);
	return res.json();
}

export function getfrontEndUrl() {
	return process.env.FRONTEND_URL ?? "http://localhost:5173";
}

/**
 * Memoize ETag computation by payload reference. When a route returns the same
 * object across requests (e.g. a cached bootstrap payload), we skip the
 * JSON.stringify + SHA1 roundtrip entirely. The WeakMap is keyed by object
 * identity so it's GC-safe and requires no eviction policy.
 */
const etagMemo = new WeakMap<object, string>();

export function computeWeakEtag(payload: unknown): string {
	if (payload !== null && typeof payload === "object") {
		const cached = etagMemo.get(payload as object);
		if (cached) return cached;
		const hash = createHash("sha1").update(JSON.stringify(payload)).digest("base64url");
		const tag = `W/"${hash}"`;
		etagMemo.set(payload as object, tag);
		return tag;
	}
	const hash = createHash("sha1").update(JSON.stringify(payload)).digest("base64url");
	return `W/"${hash}"`;
}

export function sendEtaggedJson(req: Request, res: Response, payload: unknown): void {
	const etag = computeWeakEtag(payload);
	res.setHeader("ETag", etag);

	const ifNoneMatch = req.get("If-None-Match");
	if (ifNoneMatch) {
		const tags = ifNoneMatch
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean);
		if (tags.includes("*") || tags.includes(etag)) {
			res.status(304).end();
			return;
		}
	}

	res.json(payload);
}
