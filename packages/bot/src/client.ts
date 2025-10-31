import * as fs from "node:fs";
import path from "node:path";
import type { StatisticalTemplate } from "@dicelette/core";
import type { BotStatus, CriticalCount, GuildData, UserDatabase } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import Enmap, { type EnmapOptions } from "enmap";

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

export const client = new EClient({
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
});
