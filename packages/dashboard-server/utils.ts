import type { Settings } from "@dicelette/types";
import type { Request, Response } from "express";
import type { BotChannels, DashboardDeps } from "./index";
import {
	DISCORD_API,
	type EmbedField,
	PERM_CACHE_TTL,
	permCache,
	type RawEmbed,
	SNOWFLAKE_RE,
	STATS_TITLES,
	USER_EMBED_MARKERS,
} from "./types";

/**
 * Détecte une URL Discord CDN dont les paramètres d'expiration ont été supprimés
 * par cleanAvatarUrl(). Ces URLs sont invalides car Discord requiert les params
 * ?ex=...&is=...&hm=... pour les fichiers attachés depuis 2023.
 */
export function isStaleDiscordCdnUrl(url: string | null): boolean {
	if (!url) return false;
	return /(cdn|media)\.discordapp\.(net|com)/i.test(url) && !url.includes("?");
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

		const Administrator = BigInt(0x8);

		// Administrator always has access regardless of dashboardAccess
		if (member.hasPermission(Administrator)) {
			permCache.set(cacheKey, { result: true, expiresAt: Date.now() + PERM_CACHE_TTL });
			return true;
		}

		const dashboardAccess = settings?.get(guildId, "dashboardAccess") as
			| string[]
			| undefined;

		let result: boolean;
		if (dashboardAccess && dashboardAccess.length > 0) {
			// When dashboardAccess is set, only users with one of those roles have access
			result = member.roleIds.some((roleId) => dashboardAccess.includes(roleId));
		} else {
			// Default: ManageGuild grants access
			const ManageGuild = BigInt(0x20);
			result = member.hasPermission(ManageGuild);
		}

		permCache.set(cacheKey, { result, expiresAt: Date.now() + PERM_CACHE_TTL });
		return result;
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
		const Administrator = BigInt(0x8);
		const ManageGuild = BigInt(0x20);
		const ManageRoles = BigInt(0x10000000);
		const result =
			member.hasPermission(Administrator) ||
			member.hasPermission(ManageGuild) ||
			member.hasPermission(ManageRoles);
		permCache.set(cacheKey, { result, expiresAt: Date.now() + PERM_CACHE_TTL });
		return result;
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

export function classifyEmbed(embed: RawEmbed): "user" | "stats" | "damage" | null {
	const title = (embed.title ?? "").toLowerCase();
	if (USER_EMBED_MARKERS.some((m) => title.includes(m.toLowerCase()))) return "user";
	if (STATS_TITLES.some((s) => title === s)) return "stats";
	if (title === "macro") return "damage";
	return null;
}

export async function fetchCharacterEmbeds(
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
