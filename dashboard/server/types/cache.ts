import type { ApiCharacter, DiscordGuild } from "./types";

/** Cache TTL: 5 min for character sheets */
export const CHAR_CACHE_TTL = 5 * 60 * 1000;
/** Cache TTL: 5 min for permissions */
export const PERM_CACHE_TTL = 5 * 60 * 1000;
export const USER_GUILD_CACHE_TTL_MS = 5 * 60 * 1000;

interface CharEntry {
	data: ApiCharacter[];
	ts: number;
}

interface PermEntry {
	result: boolean;
	expiresAt: number;
}

/**
 * Character-sheet cache. Keys: `${guildId}:${userId}` or `${guildId}:*all*`.
 * A per-guild index allows O(1) invalidation of all entries of a guild without
 * scanning the full map. Entries past CHAR_CACHE_TTL are evicted lazily on read.
 */
const charStore = new Map<string, CharEntry>();
const charByGuild = new Map<string, Set<string>>();

function indexAdd(index: Map<string, Set<string>>, guildId: string, key: string) {
	let set = index.get(guildId);
	if (!set) {
		set = new Set();
		index.set(guildId, set);
	}
	set.add(key);
}

function indexRemove(index: Map<string, Set<string>>, guildId: string, key: string) {
	const set = index.get(guildId);
	if (!set) return;
	set.delete(key);
	if (set.size === 0) index.delete(guildId);
}

function guildIdOf(key: string): string {
	const i = key.indexOf(":");
	return i === -1 ? key : key.slice(0, i);
}

export const charCache = {
	get(key: string): CharEntry | undefined {
		const entry = charStore.get(key);
		if (!entry) return undefined;
		if (Date.now() - entry.ts >= CHAR_CACHE_TTL) {
			charStore.delete(key);
			indexRemove(charByGuild, guildIdOf(key), key);
			return undefined;
		}
		return entry;
	},
	set(key: string, value: CharEntry): void {
		charStore.set(key, value);
		indexAdd(charByGuild, guildIdOf(key), key);
	},
	delete(key: string): boolean {
		const had = charStore.delete(key);
		if (had) indexRemove(charByGuild, guildIdOf(key), key);
		return had;
	},
	deleteGuild(guildId: string): void {
		const keys = charByGuild.get(guildId);
		if (!keys) return;
		for (const key of keys) charStore.delete(key);
		charByGuild.delete(guildId);
	},
	get size(): number {
		return charStore.size;
	},
};

/** Set of cache keys that must bypass the Discord message cache on next read */
const forceRefreshStore = new Set<string>();
const forceRefreshByGuild = new Map<string, Set<string>>();

export const charForceRefresh = {
	add(key: string): void {
		forceRefreshStore.add(key);
		indexAdd(forceRefreshByGuild, guildIdOf(key), key);
	},
	delete(key: string): boolean {
		const had = forceRefreshStore.delete(key);
		if (had) indexRemove(forceRefreshByGuild, guildIdOf(key), key);
		return had;
	},
	has(key: string): boolean {
		return forceRefreshStore.has(key);
	},
	deleteGuild(guildId: string): void {
		const keys = forceRefreshByGuild.get(guildId);
		if (!keys) return;
		for (const key of keys) forceRefreshStore.delete(key);
		forceRefreshByGuild.delete(guildId);
	},
};

/**
 * Permission cache. Keys end with `:${guildId}` (e.g. `${userId}:${guildId}`,
 * `refresh:${userId}:${guildId}`, `channel:${userId}:${guildId}:${channelId}`,
 * `oauth:${userId}:${guildId}`). A per-guild index enables O(1) invalidation.
 * Entries past `expiresAt` are evicted lazily on read.
 */
const permStore = new Map<string, PermEntry>();
const permByGuild = new Map<string, Set<string>>();

function permGuildIdOf(key: string): string {
	const i = key.lastIndexOf(":");
	// For channel keys we want the guildId, not the channelId. Walk back one more segment.
	if (key.startsWith("channel:")) {
		const prev = key.lastIndexOf(":", i - 1);
		return key.slice(prev + 1, i);
	}
	return key.slice(i + 1);
}

export const permCache = {
	get(key: string): PermEntry | undefined {
		const entry = permStore.get(key);
		if (!entry) return undefined;
		if (Date.now() >= entry.expiresAt) {
			permStore.delete(key);
			indexRemove(permByGuild, permGuildIdOf(key), key);
			return undefined;
		}
		return entry;
	},
	set(key: string, value: PermEntry): void {
		permStore.set(key, value);
		indexAdd(permByGuild, permGuildIdOf(key), key);
	},
	delete(key: string): boolean {
		const had = permStore.delete(key);
		if (had) indexRemove(permByGuild, permGuildIdOf(key), key);
		return had;
	},
	deleteGuild(guildId: string): void {
		const keys = permByGuild.get(guildId);
		if (!keys) return;
		for (const key of keys) permStore.delete(key);
		permByGuild.delete(guildId);
	},
	get size(): number {
		return permStore.size;
	},
};

export const userGuildCache = new Map<
	string,
	{ guilds: DiscordGuild[]; expiresAt: number }
>();
