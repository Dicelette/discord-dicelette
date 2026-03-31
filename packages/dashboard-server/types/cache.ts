import type { ApiCharacter, DiscordGuild } from "./types";

/** Cache des fiches personnage : clé = `${guildId}:${userId}`, TTL = 5 min */
export const CHAR_CACHE_TTL = 5 * 60 * 1000;
export const charCache = new Map<string, { data: ApiCharacter[]; ts: number }>();
/** Cache des permissions : clé = `${userId}:${guildId}`, TTL = 5 min */
export const PERM_CACHE_TTL = 5 * 60 * 1000;
export const permCache = new Map<string, { result: boolean; expiresAt: number }>();
export const userGuildCache = new Map<
	string,
	{ guilds: DiscordGuild[]; expiresAt: number }
>();
export const USER_GUILD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
