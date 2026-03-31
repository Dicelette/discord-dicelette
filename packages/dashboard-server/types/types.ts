// ---------------------------------------------------------------------------
// Types, interfaces et constantes partagées pour les routes /guilds
// ---------------------------------------------------------------------------

import { CHAR_CACHE_TTL, charCache, permCache } from "./cache";

export interface EmbedField {
	name: string;
	value: string;
}

export interface RawEmbed {
	title?: string;
	thumbnail?: { url: string };
	fields?: readonly EmbedField[];
}

export interface ApiCharacter {
	charName: string | null;
	messageId: string;
	channelId: string;
	discordLink: string;
	canLink: boolean;
	isPrivate: boolean;
	avatar: string | null;
	stats: EmbedField[] | null;
	damage: EmbedField[] | null;
	/** Only present in admin server-wide character list */
	userId?: string;
	/** Discord display name of the owner — only present in admin server-wide character list */
	ownerName?: string;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Caches module-level (singleton par processus)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Cache pruning — prevents unbounded memory growth over time
// ---------------------------------------------------------------------------

setInterval(
	() => {
		const now = Date.now();
		for (const [key, entry] of permCache) {
			if (now >= entry.expiresAt) permCache.delete(key);
		}
	},
	10 * 60 * 1000
).unref();

setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of charCache) {
		if (now - entry.ts >= CHAR_CACHE_TTL) charCache.delete(key);
	}
}, CHAR_CACHE_TTL).unref();
