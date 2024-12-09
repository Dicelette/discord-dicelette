// noinspection SuspiciousTypeOfGuard

import type { DiscordChannel, Settings, Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import { embedError, reply, sendLogs } from "messages";
export async function searchUserChannel(
	guildData: Settings,
	interaction: Djs.BaseInteraction,
	ul: Translation,
	channelId: string,
	register?: boolean
): Promise<DiscordChannel> {
	let thread: Djs.TextChannel | Djs.AnyThreadChannel | undefined | Djs.GuildBasedChannel =
		undefined;
	try {
		const channel = await interaction.guild?.channels.fetch(channelId);
		if (channel instanceof Djs.ForumChannel && register) return;
		if (
			!channel ||
			channel instanceof Djs.CategoryChannel ||
			channel instanceof Djs.ForumChannel ||
			channel instanceof Djs.MediaChannel ||
			channel instanceof Djs.StageChannel ||
			channel instanceof Djs.VoiceChannel
		) {
			if (
				interaction instanceof Djs.CommandInteraction ||
				interaction instanceof Djs.ButtonInteraction ||
				interaction instanceof Djs.ModalSubmitInteraction
			)
				await interaction?.channel?.send({
					embeds: [embedError(ul("error.noThread"), ul)],
				});

			await sendLogs(ul("error.noThread"), interaction.guild as Djs.Guild, guildData);
			return;
		}
		thread = channel;
	} catch (error) {
		logger.error("Error while fetching channel", error);
		return;
	}
	if (!thread) {
		if (
			interaction instanceof Djs.CommandInteraction ||
			interaction instanceof Djs.ButtonInteraction ||
			interaction instanceof Djs.ModalSubmitInteraction
		) {
			if (interaction.replied)
				await interaction.editReply({ embeds: [embedError(ul("error.noThread"), ul)] });
			else await reply(interaction, { embeds: [embedError(ul("error.noThread"), ul)] });
		} else
			await sendLogs(ul("error.noThread"), interaction.guild as Djs.Guild, guildData);
		return;
	}
	if (thread.isThread() && thread.archived) thread.setArchived(false);
	return thread;
}
