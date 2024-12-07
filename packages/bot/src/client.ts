import type { GuildData } from "@dicelette/types";
import * as Djs from "discord.js";
import Enmap from "enmap";

export class EClient extends Djs.Client {
	public settings: Enmap<string, GuildData, unknown>;

	constructor(options: Djs.ClientOptions) {
		super(options);

		this.settings = new Enmap({
			name: "settings",
			fetchAll: false,
			autoFetch: true,
			cloneLevel: "deep",
		});
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
