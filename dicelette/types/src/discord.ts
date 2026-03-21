import type * as Djs from "discord.js";

export type DiscordChannel =
	| Djs.PrivateThreadChannel
	| Djs.PublicThreadChannel
	| Djs.TextChannel
	| Djs.NewsChannel
	| undefined;

export type DiscordTextChannel =
	| Djs.TextChannel
	| Djs.NewsChannel
	| Djs.StageChannel
	| Djs.PrivateThreadChannel
	| Djs.PublicThreadChannel
	| Djs.VoiceChannel;

export type BotStatus = {
	text: string;
	type?: Djs.ActivityType;
};
