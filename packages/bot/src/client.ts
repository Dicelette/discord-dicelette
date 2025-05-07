import path from "node:path";
import type { GuildData, UserDatabase } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import Enmap, { type EnmapOptions } from "enmap";
import type { StatisticalTemplate } from "@dicelette/core";

export class EClient extends Djs.Client {
	public settings: Enmap<string, GuildData, unknown>;
	public characters: Enmap<string, UserDatabase, unknown>;
	public template: Enmap<string, StatisticalTemplate, unknown>;

	constructor(options: Djs.ClientOptions) {
		super(options);

		const enmapSettings: EnmapOptions<GuildData, unknown> = {
			name: "settings",
			fetchAll: false,
			autoFetch: true,
			cloneLevel: "deep",
		};
		if (process.env.PROD) enmapSettings.dataDir = path.resolve(".\\data_prod");

		this.settings = new Enmap(enmapSettings);

		logger.info(`Settings loaded on ${path.resolve(enmapSettings.dataDir ?? ".\\data")}`);

		//@ts-ignore: Needed because enmap.d.ts issue with inMemory options
		this.characters = new Enmap({ inMemory: true });
		//@ts-ignore: Needed because enmap.d.ts issue with inMemory options
		this.template = new Enmap({ inMemory: true });
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
		Djs.Partials.User,
	],
});
