import { createBotClient, type EClient } from "@dicelette/client";
import * as Djs from "discord.js";

// Re-export EClient for backward compatibility
export type { EClient };

// Create and export the bot client instance
export const client = createBotClient({
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
