// ---------------------------------------------------------------------------
// Types, interfaces and shared constants for /guilds routes
// ---------------------------------------------------------------------------

import type { StatisticalTemplate } from "@dicelette/core";
import type { Characters, Settings, TemplateData, UserSettings } from "@dicelette/types";
import type Enmap from "enmap";
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

export interface DiscordUser {
	id: string;
	username: string;
	discriminator: string;
	avatar: string | null;
	global_name: string | null;
}

export interface DiscordGuild {
	id: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string;
}

/** A guild member with computed effective permissions */
export interface BotMember {
	/** Returns true if the member's effective permissions include the given bitfield flag */
	hasPermission: (flag: bigint) => boolean;
	/** IDs of all roles assigned to this member */
	readonly roleIds: string[];
}

/** A guild accessible through the bot's Discord.js client cache */
export interface BotGuild {
	/** Fetch a guild member; checks Discord.js cache first, falls back to API if needed */
	fetchMember: (userId: string) => Promise<BotMember | null>;
	/** Returns true if the member can view/read the target channel */
	memberCanAccessChannel: (userId: string, channelId: string) => Promise<boolean>;
	/** Fetch the user's Discord handle (pomelo), formatted as @username */
	fetchMemberName: (userId: string) => Promise<string | null>;
	/** All channels in the guild (all types, let the caller filter) */
	readonly channels: ReadonlyArray<{ id: string; name: string; type: number }>;
	/** All roles except @everyone */
	readonly roles: ReadonlyArray<{ id: string; name: string; color: number }>;
}

/** A Discord message with its embeds and attachments */
export interface BotMessage {
	readonly embeds: ReadonlyArray<{
		title?: string;
		thumbnail?: { url: string };
		fields?: ReadonlyArray<{ name: string; value: string }>;
	}>;
	readonly attachments: ReadonlyArray<{ filename: string; url: string }>;
}

/** Channel accessor backed by the Discord.js client cache */
export interface BotChannels {
	/** Fetch a message; checks Discord.js message cache first, falls back to API */
	fetchMessage: (
		channelId: string,
		messageId: string,
		options?: { force?: boolean }
	) => Promise<BotMessage | null>;
	/** Delete a message; returns true if deleted, false if not found or forbidden */
	deleteMessage: (channelId: string, messageId: string) => Promise<boolean>;
	/** Send a plain-text message to a channel; returns true if sent */
	sendMessage: (channelId: string, content: string) => Promise<boolean>;
	/**
	 * Post the template message (embed + template.json attachment + register button) and pin it.
	 * If publicChannel is not provided and the channel supports threads, a default thread is
	 * created automatically; its id is returned as publicChannelId.
	 */
	sendTemplate: (
		channelId: string,
		template: StatisticalTemplate,
		guildId: string,
		publicChannel?: string,
		privateChannel?: string
	) => Promise<{ messageId: string; publicChannelId?: string } | null>;
	/**
	 * Import characters from CSV text, posting real Discord messages with embeds.
	 * Mirrors the /import bot command logic: parses CSV, builds embeds, posts to Discord,
	 * registers data in settings + memory. Optionally deletes the previous message on reimport.
	 */
	bulkImportCharacters: (
		guildId: string,
		csvText: string,
		deleteOldMessages: boolean
	) => Promise<{ success: number; failed: number; errors: string[] }>;
	/**
	 * Export characters to CSV buffer. Fetches all character data, builds CSV with proper backtick cleaning.
	 * Same logic as /export bot command.
	 */
	exportCharactersCsv: (guildId: string, isPrivate?: boolean) => Promise<Buffer | null>;
}

export interface DashboardDeps {
	settings: Settings;
	userSettings: Enmap<UserSettings>;
	template: TemplateData;
	characters: Characters;
	botGuilds: {
		has: (id: string) => boolean;
		get: (id: string) => BotGuild | undefined;
	};
	botChannels: BotChannels;
	guildEvents: import("node:events").EventEmitter;
	bulkEditTemplateUser?: (
		guildId: string,
		templateData: StatisticalTemplate
	) => Promise<void>;
}
