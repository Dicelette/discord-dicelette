import { fetchChannel } from "@dicelette/bot-helpers";
import type { DiscordChannel, Settings, Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import { embedError, sendLogs } from "messages";
import { isValidChannel, isValidInteraction } from "utils";

/**
 * Retrieve and validate a guild channel by ID, handling user-facing errors, logging, and thread unarchiving.
 *
 * @param guildData - Guild configuration used for log routing and behavior decisions
 * @param interaction - The initiating Discord interaction used to send feedback to the user
 * @param ul - Localization function for error and feedback messages
 * @param channelId - ID of the channel to fetch
 * @param register - When true, treat ForumChannels as intentionally skipped and return `undefined`
 * @param skipNoFound - When true, suppress user-facing error handling and logging if the channel is not found or invalid
 * @returns The validated Discord channel (text/thread) or `undefined` if not found, invalid, or skipped
 */
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
		if (!isValidChannel(channel, interaction)) {
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
		logger.error("Error while fetching channel", error);
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
