import type { DiscordChannel, Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { embedError, sendLogs } from "messages";
import { fetchChannel, isValidChannel, isValidInteraction } from "utils";
/**
 * Fetches and validates a Discord channel by ID within a guild context, handling errors and localization.
 *
 * Attempts to retrieve the specified channel, validates its suitability for interaction, and manages error reporting through embeds and logging. If the channel is a thread and archived, it is unarchived before returning.
 *
 * @param guildData - Guild-specific configuration settings.
 * @param interaction - The Discord.js interaction initiating the request.
 * @param ul - Function for localized message translation.
 * @param channelId - The ID of the channel to fetch and validate.
 * @param register - If true, skips further processing for forum channels.
 * @returns The fetched and validated Discord channel, or `undefined` if not found or invalid.
 */
export async function searchUserChannel(
	guildData: Settings,
	interaction: Djs.BaseInteraction,
	ul: Translation,
	channelId: string,
	register?: boolean,
): Promise<DiscordChannel> {
	let thread:
		| Djs.TextChannel
		| Djs.AnyThreadChannel
		| undefined
		| Djs.GuildBasedChannel;
	const msg = ul("error.channel.thread");
	const embeds = [embedError(msg, ul)];
	try {
		const channel = await fetchChannel(interaction.guild!, channelId);
		if (channel?.type === Djs.ChannelType.GuildForum && register) return;
		if (!isValidChannel(channel, interaction)) {
			if (isValidInteraction(interaction) && interaction.channel?.isSendable())
				await interaction?.channel?.send({
					embeds,
				});
			else {
				await interaction.user.send({
					embeds,
				});
			}

			await sendLogs(msg, interaction.guild as Djs.Guild, guildData);
			return;
		}
		thread = channel as DiscordChannel;
	} catch (error) {
		console.error("\nError while fetching channel", error);
		return;
	}
	if (!thread) {
		if (isValidInteraction(interaction)) {
			if (interaction.isRepliable()) {
				if (interaction.replied) await interaction.editReply({ embeds });
				else await interaction.reply({ embeds });
			}
		} else await sendLogs(msg, interaction.guild as Djs.Guild, guildData);
		return;
	}
	if (thread.isThread() && thread.archived) thread.setArchived(false);
	return thread as DiscordChannel;
}
