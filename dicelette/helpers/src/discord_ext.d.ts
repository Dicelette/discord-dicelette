// Local declaration merging to allow use of setNames/setDescriptions in helpers
// Actual implementation is provided at runtime by bot package's discord_ext.ts
import "discord.js";

declare module "discord.js" {
	interface SlashCommandStringOption {
		setNames(name: string): this;
		setDescriptions(desc: string): this;
	}
	interface SlashCommandUserOption {
		setNames(name: string): this;
		setDescriptions(desc: string): this;
	}
	interface SlashCommandBooleanOption {
		setNames(name: string): this;
		setDescriptions(desc: string): this;
	}
}
