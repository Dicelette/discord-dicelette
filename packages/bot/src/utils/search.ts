import type { DiscordChannel, Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { embedError, sendLogs } from "messages";
import { isValidChannel, isValidInteraction } from "utils";
export async function searchUserChannel(
	guildData: Settings,
	interaction: Djs.BaseInteraction,
	ul: Translation,
	channelId: string,
	register?: boolean
): Promise<DiscordChannel> {
	let thread: Djs.TextChannel | Djs.AnyThreadChannel | undefined | Djs.GuildBasedChannel =
		undefined;
	const msg = ul("error.noThread");
	const embeds = [embedError(msg, ul)];
	try {
		const channel = await interaction.guild?.channels.fetch(channelId);
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
		console.error("Error while fetching channel", error);
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
