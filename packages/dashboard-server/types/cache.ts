import type { ApiCharacter } from "./types";

/** Cache des fiches personnage : clé = `${guildId}:${userId}`, TTL = 5 min */
export const CHAR_CACHE_TTL = 5 * 60 * 1000;
export const charCache = new Map<string, { data: ApiCharacter[]; ts: number }>();
/** Cache des permissions : clé = `${userId}:${guildId}`, TTL = 5 min */
export const PERM_CACHE_TTL = 5 * 60 * 1000;
export const permCache = new Map<string, { result: boolean; expiresAt: number }>();
