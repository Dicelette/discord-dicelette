import * as fs from "node:fs";
import path from "node:path";
import type { StatisticalTemplate } from "@dicelette/core";
import type {
	BotStatus,
	CriticalCount,
	GuildData,
	UserDatabase,
	UserSettings,
} from "@dicelette/types";
import { logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import Enmap, { type EnmapOptions } from "enmap";

/**
 * Extended Discord.js Client with Dicelette-specific functionality.
 * Manages guild settings, user data, templates, and bot status.
 */
export class EClient extends Djs.Client {
	/**
	 * Settings in long-term memory for the bot.
	 */
	public settings: Enmap<string, GuildData, unknown>;

	/**
	 * Enmap for storing user data to accelerate the bot when fetching user data.
	 * Initialized when the bot starts.
	 * Stored in memory, and flushed when the bot restarts.
	 */
	public characters: Enmap<string, UserDatabase, unknown>;

	/**
	 * Enmap for storing templates to accelerate the bot when fetching templates.
	 * Used mostly when creating a characters or when using a global dice.
	 * Initialized when the bot starts.
	 * Stored in memory, and flushed when the bot restarts.
	 */
	public template: Enmap<string, StatisticalTemplate, unknown>;

	/**
	 * Enmap for guild locale
	 */
	public guildLocale: Enmap<string, Djs.Locale, unknown>;

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

	public userSettings: Enmap<string, UserSettings, unknown>;

	constructor(options: Djs.ClientOptions) {
		super(options);

		const enmapSettings: EnmapOptions<GuildData, unknown> = {
			autoFetch: true,
			cloneLevel: "deep",
			fetchAll: false,
			name: "settings",
		};

		this.criticalCount = new Enmap({
			autoFetch: true,
			cloneLevel: "deep",
			fetchAll: false,
			name: "criticalCount",
		});

		this.userSettings = new Enmap({
			autoFetch: true,
			cloneLevel: "deep",
			fetchAll: false,
			name: "userSettings",
		});

		//read status from files in ./data folder
		if (fs.existsSync(this.statusPath)) {
			const data = fs.readFileSync(this.statusPath, "utf-8");
			this.status = JSON.parse(data) as BotStatus;
		} else {
			//create the file with default status
			fs.writeFileSync(this.statusPath, JSON.stringify(this.status), "utf-8");
		}

		if (process.env.PROD) enmapSettings.dataDir = path.resolve(".\\data_prod");

		this.settings = new Enmap(enmapSettings);

		logger.info(`Settings loaded on ${path.resolve(enmapSettings.dataDir ?? ".\\data")}`);

		//@ts-expect-error: Needed because enmap.d.ts issue with inMemory options
		this.characters = new Enmap({ inMemory: true });
		//@ts-expect-error: Needed because enmap.d.ts issue with inMemory options
		this.template = new Enmap({ inMemory: true });
		//@ts-expect-error: Needed because enmap.d.ts issue with inMemory options
		this.guildLocale = new Enmap({ inMemory: true });
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
