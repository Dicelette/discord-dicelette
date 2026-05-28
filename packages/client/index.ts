import * as fs from "node:fs";
import * as path from "node:path";
import type {
	BotStatus,
	Characters,
	CriticalCount,
	GuildData,
	Settings,
	TemplateData,
	UserPreferences,
	UserSettings,
} from "@dicelette/types";
import { important, logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import Enmap, { type EnmapOptions } from "enmap";
import "uniformize";

export interface TemplateDerivedAutocompleteCache {
	standardizedDamageNames: string[];
	standardizedExcludedStats: string[];
	standardizedStatsNames: string[];
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

	public templateDerivedAutocompleteCache: WeakMap<
		GuildData["templateID"],
		TemplateDerivedAutocompleteCache
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

	private buildTemplateDerivedAutocompleteCache(
		templateID: GuildData["templateID"]
	): TemplateDerivedAutocompleteCache {
		return {
			standardizedDamageNames: (templateID.damageName ?? []).map((x) => x.standardize()),
			standardizedExcludedStats: (templateID.excludedStats ?? []).map((x) =>
				x.standardize()
			),
			standardizedStatsNames: (templateID.statsName ?? []).map((x) => x.standardize()),
		};
	}

	getTemplateDerivedAutocompleteCache(templateID?: GuildData["templateID"]) {
		if (!templateID) return undefined;
		const cached = this.templateDerivedAutocompleteCache.get(templateID);
		if (cached) return cached;
		const computed = this.buildTemplateDerivedAutocompleteCache(templateID);
		this.templateDerivedAutocompleteCache.set(templateID, computed);
		return computed;
	}

	refreshTemplateDerivedAutocompleteCache(templateID?: GuildData["templateID"]) {
		if (!templateID) return undefined;
		const computed = this.buildTemplateDerivedAutocompleteCache(templateID);
		this.templateDerivedAutocompleteCache.set(templateID, computed);
		return computed;
	}

	clearTemplateDerivedAutocompleteCache(templateID?: GuildData["templateID"]) {
		if (!templateID) return;
		this.templateDerivedAutocompleteCache.delete(templateID);
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
		...options,
	});
}
