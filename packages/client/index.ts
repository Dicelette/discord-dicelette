import * as fs from "node:fs";
import * as path from "node:path";
import type {
	BotStatus,
	Characters,
	CriticalCount,
	GuildData,
	Settings,
	TemplateData,
	UserData,
	UserPreferences,
	UserSettings,
} from "@dicelette/types";
import { important, logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import Enmap, { type EnmapOptions } from "enmap";
import "uniformize";

export interface TemplateAutocompleteCache {
	damageNames: string[];
	excludedStats: string[];
	statsNames: string[];
}

/**
 * Extended Discord.js Client with Dicelette-specific functionality.
 * Manages guild settings, user data, templates, and bot status.
 */
export class EClient extends Djs.Client {
	/**
	 * Settings in long-term memory for the bot.
	 */
	public settings: Settings;

	/**
	 * Enmap for storing user data to accelerate the bot when fetching user data.
	 * Initialized when the bot starts.
	 * Stored in memory, and flushed when the bot restarts.
	 */
	public characters: Characters;

	/**
	 * Enmap for storing templates to accelerate the bot when fetching templates.
	 * Used mostly when creating a characters or when using a global dice.
	 * Initialized when the bot starts.
	 * Stored in memory, and flushed when the bot restarts.
	 */
	public template: TemplateData;

	/**
	 * Enmap for guild locale
	 */
	public guildLocale: Enmap<Djs.Locale>;

	public criticalCount: CriticalCount;

	/**
	 * Cache for trivial comparisons (always `true`/`false`)
	 * - Used to avoid updating consecutive streak on trivial rolls
	 * - Also and more important, prevent the pity to trigger if an user use a "fake" failure (`1d10>11` for example)
	 * @important **Only used if pity is enabled in the server settings**
	 * @key `guildId:authorId:channelId:(timestamp/60_000)`
	 * @key `guildId:authorId:channelId:(timestamp/60_000 - 1)` *(to avoid edge cases around minute changes)*
	 */
	public trivialCache: Set<string> = new Set();

	/**
	 * Map of timeouts for trivial cache cleanup
	 * - Used to prevent memory leaks by clearing timeouts when cache entries are manually deleted
	 * @key `guildId:authorId:channelId:(timestamp/60_000)`
	 */
	public trivialCacheTimeouts: Map<string, NodeJS.Timeout> = new Map();

	/**
	 * Timestamps tracking when each user's character data was last cached.
	 * Used for periodic TTL-based cache cleanup.
	 * @key `${guildId}:${userId}`
	 * @value Unix timestamp (ms) of last cache write
	 */
	public characterCacheTimestamps: Map<string, number> = new Map();

	/**
	 * Key the last status when the bot restarts
	 */
	public status: BotStatus = {
		text: "Bringing chaos !",
		type: Djs.ActivityType.Playing,
	};

	/**
	 * Path to the status file
	 * Used to store the status when the bot restarts
	 * Allow to quicker set the status on bot restart & update it
	 */
	public statusPath = path.resolve("./data/status.json");

	public userSettings: Enmap<UserSettings>;

	public userPreferences: Enmap<UserPreferences>;

	public templateAutocompleteCache: WeakMap<
		GuildData["templateID"],
		TemplateAutocompleteCache
	> = new WeakMap();

	constructor(options: Djs.ClientOptions) {
		super(options);

		const enmapSettings: EnmapOptions<GuildData> = {
			name: "settings",
		};

		this.criticalCount = new Enmap({
			name: "criticalCount",
		});

		this.userSettings = new Enmap({
			name: "userSettings",
		});

		this.userPreferences = new Enmap({
			name: "userPreferences",
		});

		//read status from files in ./data folder
		if (fs.existsSync(this.statusPath)) {
			const data = fs.readFileSync(this.statusPath, "utf-8");
			this.status = JSON.parse(data) as BotStatus;
			important.info(`Status file loaded from ${this.statusPath}.`);
		} else {
			//create the file with default status
			fs.writeFileSync(this.statusPath, JSON.stringify(this.status), "utf-8");
			important.info(`Status file created at ${this.statusPath} with default status.`);
		}

		if (process.env.E2E) enmapSettings.dataDir = path.resolve(".\\data_e2e");
		else if (process.env.PROD) enmapSettings.dataDir = path.resolve(".\\data_prod");

		this.settings = new Enmap(enmapSettings);

		logger.info(`Settings loaded on ${path.resolve(enmapSettings.dataDir ?? ".\\data")}`);

		this.characters = new Enmap({ inMemory: true });
		this.template = new Enmap({ inMemory: true });
		this.guildLocale = new Enmap({ inMemory: true });
	}

	private buildTemplateAutocompleteCache(
		templateID: GuildData["templateID"]
	): TemplateAutocompleteCache {
		return {
			damageNames: (templateID.damageName ?? []).map((x) => x.standardize()),
			excludedStats: (templateID.excludedStats ?? []).map((x) => x.standardize()),
			statsNames: (templateID.statsName ?? []).map((x) => x.standardize()),
		};
	}

	getTemplateAutocompleteCache(templateID?: GuildData["templateID"]) {
		if (!templateID) return undefined;
		const cached = this.templateAutocompleteCache.get(templateID);
		if (cached) return cached;
		const computed = this.buildTemplateAutocompleteCache(templateID);
		const duringCompute = this.templateAutocompleteCache.get(templateID);
		if (duringCompute) return duringCompute;
		this.templateAutocompleteCache.set(templateID, computed);
		return computed;
	}

	refreshTemplateAutocompleteCache(templateID?: GuildData["templateID"]) {
		if (!templateID) return undefined;
		const computed = this.buildTemplateAutocompleteCache(templateID);
		this.templateAutocompleteCache.set(templateID, computed);
		return computed;
	}

	clearTemplateAutocompleteCache(templateID?: GuildData["templateID"]) {
		if (!templateID) return;
		this.templateAutocompleteCache.delete(templateID);
	}

	/**
	 * Write a user's character list to the in-memory cache **and** stamp its TTL timestamp.
	 *
	 * Always prefer this over calling `characters.set(...)` directly: the periodic cleanup
	 * (see `startCacheCleanup`) can only evict entries that have a matching timestamp in
	 * `characterCacheTimestamps`. A bare `characters.set` creates an entry the sweeper can
	 * never reclaim, leaking memory until the next restart.
	 *
	 * @param guildId - Guild the character belongs to.
	 * @param value - The user's full character list.
	 * @param userId - Owner of the character list.
	 */
	setCharacter(guildId: string, value: UserData[], userId: string) {
		this.characters.set(guildId, value, userId);
		this.characterCacheTimestamps.set(`${guildId}:${userId}`, Date.now());
	}

	/**
	 * Remove character data from the in-memory cache and drop the matching TTL timestamp(s),
	 * keeping `characters` and `characterCacheTimestamps` in sync.
	 *
	 * @param guildId - Guild to clear.
	 * @param userId - When provided, only that user's entry is removed; otherwise the whole guild.
	 */
	deleteCharacter(guildId: string, userId?: string) {
		if (userId) {
			this.characters.delete(guildId, userId);
			this.characterCacheTimestamps.delete(`${guildId}:${userId}`);
			return;
		}
		this.characters.delete(guildId);
		const prefix = `${guildId}:`;
		for (const key of this.characterCacheTimestamps.keys()) {
			if (key.startsWith(prefix)) this.characterCacheTimestamps.delete(key);
		}
	}
}

/**
 * Create a new EClient instance with default intents and partials.
 * Use this factory function instead of instantiating EClient directly.
 *
 * @param options - Discord.js ClientOptions to override defaults
 * @returns Configured EClient instance
 */
export function createBotClient(options?: Partial<Djs.ClientOptions>): EClient {
	return new EClient({
		intents: [
			Djs.GatewayIntentBits.GuildMessages,
			Djs.GatewayIntentBits.MessageContent,
			Djs.GatewayIntentBits.Guilds,
			Djs.GatewayIntentBits.GuildMembers,
			Djs.GatewayIntentBits.GuildMessageReactions,
		],
		partials: [
			Djs.Partials.Channel,
			Djs.Partials.GuildMember,
			Djs.Partials.User,
			Djs.Partials.Reaction,
		],
		/**
		 * Bound or disable Discord.js caches to prevent unbounded memory growth.
		 *
		 * The bot fetches members/users/messages on demand (see `@dicelette/helpers`
		 * `fetchWithCache`), so it never depends on a deep, long-lived cache. We therefore
		 * disable every manager tied to a feature/intent the bot does not use, and keep a
		 * small bounded message cache.
		 *
		 * Caches we MUST keep:
		 * - `ReactionManager`: read in `events/on_message_reaction.ts` (`message.reactions.cache`).
		 * - The "required" managers (Guild/Channel/GuildChannel/Role/PermissionOverwrite) cannot
		 *   be limited by Discord.js and are intentionally left untouched.
		 *
		 * `GuildMemberManager`/`UserManager` are intentionally NOT hard-limited here: a maxSize
		 * limit can evict `client.user`/`guild.members.me`. They are cleaned via `sweepers` below.
		 */
		makeCache: Djs.Options.cacheWithLimits({
			...Djs.Options.DefaultMakeCacheSettings,
			// Bound the biggest grower: messages are fetched on demand when missing.
			MessageManager: 25,
			// No voice/stage intents → these never populate, disable them entirely.
			VoiceStateManager: 0,
			StageInstanceManager: 0,
			// No GuildPresences intent.
			PresenceManager: 0,
			// Bot only uses Unicode emojis/reactions, never guild emojis or stickers.
			GuildEmojiManager: 0,
			GuildStickerManager: 0,
			// Never read by the bot.
			GuildBanManager: 0,
			GuildInviteManager: 0,
			GuildScheduledEventManager: 0,
			AutoModerationRuleManager: 0,
			ThreadMemberManager: 0,
		}),
		/**
		 * Periodically evict cached entities the bot no longer needs. Filters keep the bot's
		 * own user/member so permission checks and self-references never break.
		 */
		sweepers: {
			...Djs.Options.DefaultSweeperSettings,
			// Drop messages not touched in the last 30 min (re-fetched on demand if needed).
			messages: { interval: 3600, lifetime: 1800 },
			// Clear reactions hourly; they are only needed transiently within a handler.
			reactions: { interval: 3600, filter: () => () => true },
			// Evict every user/member except the bot itself.
			users: {
				interval: 3600,
				filter: () => (user) => user.id !== user.client.user?.id,
			},
			guildMembers: {
				interval: 3600,
				filter: () => (member) => member.id !== member.client.user?.id,
			},
		},
		...options,
	});
}
