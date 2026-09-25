import { fetchChannel } from "@dicelette/helpers";
import type { DiscordChannel, Settings, Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import { embedError, sendLogs } from "messages";
import { isValidChannel, isValidInteraction } from "utils";

/** Gets and validates a guild channel by ID, sending user-facing errors, logging, and unarchiving threads as
 * needed. `register` skips ForumChannels; `skipNoFound` suppresses error handling/logging. */
export async function searchUserChannel(
	guildData: Settings,
	interaction: Djs.BaseInteraction,
	ul: Translation,
	channelId: string,
	register?: boolean,
	skipNoFound?: boolean
): Promise<DiscordChannel> {
	let thread: Djs.TextChannel | Djs.AnyThreadChannel | undefined | Djs.GuildBasedChannel;
	const msg = ul("error.channel.thread");
	const embeds = [embedError(msg, ul)];
	try {
		const channel = await fetchChannel(interaction.guild!, channelId);
		if (register && channel instanceof Djs.ForumChannel) return;
		if (!channel || !isValidChannel(channel, interaction)) {
			// Avoid using `any`: rely on runtime class to detect forum channels
			if (register && channel instanceof Djs.ForumChannel) return;
			if (skipNoFound) return;

			if (isValidInteraction(interaction) && interaction.channel?.isSendable()) {
				await interaction.channel.send({
					embeds,
				});
			} else {
				await interaction.user.send({
					embeds,
				});
			}

			await sendLogs(msg, interaction.guild as Djs.Guild, guildData);
			return;
		}
		thread = channel as DiscordChannel;
	} catch (error) {
		logger.warn("Error while fetching channel", error);
		return;
	}
	if (!thread) {
		if (skipNoFound) return;
		if (isValidInteraction(interaction)) {
			if (interaction.isRepliable()) {
				if (interaction.replied) await interaction.editReply({ embeds });
				else await interaction.reply({ embeds });
			}
		} else await sendLogs(msg, interaction.guild as Djs.Guild, guildData);
		return;
	}
	if (thread.isThread() && thread.archived) await thread.setArchived(false);
	return thread as DiscordChannel;
}
