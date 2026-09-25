/** biome-ignore-all lint/style/useNamingConvention: DiscordAPI doesn't follow this */
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

/** Extended Discord.js Client managing guild settings, user data, templates, and bot status. */
export class EClient extends Djs.Client {
	/** Long-term persisted bot settings. */
	public settings: Settings;

	/** In-memory cache of user data, flushed on restart. */
	public characters: Characters;

	/** In-memory cache of templates, flushed on restart. */
	public template: TemplateData;

	public guildLocale: Enmap<Djs.Locale>;

	public criticalCount: CriticalCount;

	/** Cache of trivial (always-true/false) comparisons, to skip streak updates and stop pity from
	 * triggering on "fake" failures. Only used when pity is enabled. Keys: `guildId:authorId:channelId:(timestamp/60_000[-1])`. */
	public trivialCache: Set<string> = new Set();

	/** Timeout handles for `trivialCache` cleanup, keyed the same way; cleared when entries are manually deleted. */
	public trivialCacheTimeouts: Map<string, NodeJS.Timeout> = new Map();

	/** Last-cache-write timestamp (ms) per `guildId:userId`, used for TTL-based cleanup. */
	public characterCacheTimestamps: Map<string, number> = new Map();

	public status: BotStatus = {
		text: "Bringing chaos !",
		type: Djs.ActivityType.Playing,
	};

	/** Path to the persisted status file, restored on bot restart. */
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

		if (fs.existsSync(this.statusPath)) {
			const data = fs.readFileSync(this.statusPath, "utf-8");
			this.status = JSON.parse(data) as BotStatus;
			important.info(`Status file loaded from ${this.statusPath}.`);
		} else {
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

	/** Writes a user's characters to the cache and stamps its TTL timestamp. */
	setCharacter(guildId: string, value: UserData[], userId: string) {
		this.characters.set(guildId, value, userId);
		this.characterCacheTimestamps.set(`${guildId}:${userId}`, Date.now());
	}

	/** Removes character data and its TTL timestamp(s); omit `userId` to clear the whole guild. */
	deleteCharacter(guildId: string, userId?: string) {
		if (userId) {
			const key = `${guildId}:${userId}`;
			if (this.characters.has(guildId, userId)) this.characters.delete(guildId, userId);
			if (this.characterCacheTimestamps.has(key))
				this.characterCacheTimestamps.delete(key);
			return;
		}
		if (this.characters.has(guildId)) this.characters.delete(guildId);
		const prefix = `${guildId}:`;
		for (const key of this.characterCacheTimestamps.keys()) {
			if (key.startsWith(prefix)) this.characterCacheTimestamps.delete(key);
		}
	}
}

/** Creates an EClient with default intents, partials, and cache/sweeper settings. */
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
		makeCache: Djs.Options.cacheWithLimits({
			...Djs.Options.DefaultMakeCacheSettings,
			MessageManager: 25,
			VoiceStateManager: 0,
			StageInstanceManager: 0,
			PresenceManager: 0,
			GuildEmojiManager: 0,
			GuildStickerManager: 0,
			GuildBanManager: 0,
			GuildInviteManager: 0,
			GuildScheduledEventManager: 0,
			AutoModerationRuleManager: 0,
			ThreadMemberManager: 0,
		}),
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
