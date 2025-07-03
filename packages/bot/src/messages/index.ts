import type { DiscordTextChannel } from "@dicelette/types";
import type * as Djs from "discord.js";

export async function findMessageBefore(
	channel: DiscordTextChannel,
	inter: Djs.Message | Djs.InteractionResponse,
	client: Djs.Client
) {
	let messagesBefore = await channel.messages.fetch({ before: inter.id, limit: 1 });
	let messageBefore = messagesBefore.first();
	while (messageBefore && messageBefore.author.username === client.user?.username) {
		messagesBefore = await channel.messages.fetch({
			before: messageBefore.id,
			limit: 1,
		});
		messageBefore = messagesBefore.first();
	}
	return messageBefore;
}

export * from "./bulk";
export * from "./embeds";
export * from "./send";
export * from "./strip_ooc";
export * from "./thread";
