import { createUrl, type ResultAsText } from "@dicelette/parse_result";
import type { Settings, Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import { embedError, findMessageBefore, threadToSend } from "messages";
import { fetchChannel } from "utils";

export async function sendLogs(
	message: string,
	guild: Djs.Guild,
	db: Settings,
	allowMentions?: boolean
) {
	const channel = db.get(guild.id, "logs");
	try {
		if (!channel) return;
		const channelToSend = (await fetchChannel(guild, channel)) as Djs.TextChannel;
		const allowedMentions = allowMentions ? undefined : {};
		await channelToSend.send({ allowedMentions, content: message });
	} catch (error) {
		logger.warn(error);
		return;
	}
}
export async function reply(
	interaction:
		| Djs.CommandInteraction
		| Djs.ModalSubmitInteraction
		| Djs.ButtonInteraction
		| Djs.StringSelectMenuInteraction,
	options: string | Djs.MessagePayload | Djs.InteractionReplyOptions
): Promise<Djs.Message | Djs.InteractionResponse> {
	try {
		if (interaction.replied || interaction.deferred) {
			// Convert to EditReplyOptions if needed
			const editOptions =
				typeof options === "string" || options instanceof Djs.MessagePayload
					? options
					: ({ ...options } as Djs.InteractionEditReplyOptions);
			return await interaction.editReply(editOptions);
		}
		return await interaction.reply(options);
	} catch (e) {
		logger.error(e);
		return await interaction.followUp(options);
	}
}

/**
 * Convenient wrapper to reply with an error embed in ephemeral mode.
 * Use this when you need to show an error message that only the user can see.
 *
 * @param interaction - Command or modal interaction to reply to
 * @param errorText - Error message to display
 * @param ul - Translation function
 * @param cause - Optional additional context/cause string
 */
export async function replyEphemeralError(
	interaction: Djs.CommandInteraction | Djs.ModalSubmitInteraction,
	errorText: string,
	ul: Translation,
	cause?: string
): Promise<Djs.Message | Djs.InteractionResponse> {
	return reply(interaction, {
		embeds: [embedError(errorText, ul, cause)],
		flags: Djs.MessageFlags.Ephemeral,
	});
}

/**
 * Deletes a given message after a specified time delay.
 * If the time delay is zero, the function exits immediately.
 * Uses setTimeout to schedule the deletion and handles any errors silently.
 * @param message - An instance of InteractionResponse or Message that needs to be deleted.
 * @param time - A number representing the delay in milliseconds before the message is deleted.
 */
export async function deleteAfter(
	message: Djs.InteractionResponse | Djs.Message,
	time: number
): Promise<void> {
	if (time === 0) return;

	setTimeout(async () => {
		try {
			await message.delete();
		} catch (error) {
			logger.warn(error);
			// Can't delete message, probably because the message was already deleted; ignoring the error.
		}
	}, time);
}

export function displayOldAndNewStats(
	oldStats?: Djs.APIEmbedField[],
	newStats?: Djs.APIEmbedField[]
) {
	let stats = "";
	if (oldStats && newStats) {
		for (const field of oldStats) {
			const name = field.name.toLowerCase();
			const newField = newStats.find((f) => f.name.toLowerCase() === name);
			if (!newField) {
				stats += `- ~~${field.name}: ${field.value}~~\n`;
				continue;
			}
			if (field.value === newField.value) continue;
			stats += `- ${field.name}: ${field.value} ⇒ ${newField.value}\n`;
		}
		//verify if there is new stats
		for (const field of newStats) {
			const name = field.name.toLowerCase();
			if (!oldStats.find((f) => f.name.toLowerCase() === name)) {
				stats += `- ${field.name}: 0 ⇒ ${field.value}\n`;
			}
		}
	}
	return stats;
}

export async function sendResult(
	interaction: Djs.CommandInteraction,
	result: Partial<{
		roll: ResultAsText;
		expression: string;
	}>,
	settings: Settings,
	ul: Translation,
	user: Djs.User = interaction.user,
	hide?: boolean | null
) {
	const channel = interaction.channel as
		| null
		| Djs.DMChannel
		| Djs.TextChannel
		| Djs.PrivateThreadChannel
		| Djs.PublicThreadChannel;

	const disableThread = interaction.guild
		? settings.get(interaction.guild.id, "disableThread")
		: undefined;
	let rollChannel = interaction.guild
		? settings.get(interaction.guild.id, "rollChannel")
		: undefined;
	const hideResultConfig = interaction.guild
		? (settings.get(interaction.guild.id, "hiddenRoll") as string | boolean | undefined)
		: undefined;
	const hidden = hide && hideResultConfig;
	let isHidden: undefined | string;
	const allowedMentions = { users: user ? [user.id] : [] };
	const output = result.roll?.defaultMessage() ?? result.expression;
	if (hidden && output) {
		if (typeof hideResultConfig === "string") {
			//send to another channel ;
			rollChannel = hideResultConfig;
			isHidden = hideResultConfig;
		} else if (typeof hideResultConfig === "boolean") {
			return await reply(interaction, {
				allowedMentions,
				content: output,
				flags: Djs.MessageFlags.Ephemeral,
			});
		}
	}
	if (!channel) {
		return await interaction.reply({
			allowedMentions,
			content: output,
			flags: hidden ? Djs.MessageFlags.Ephemeral : undefined,
		});
	}
	if (
		channel.isDMBased() ||
		channel.name.decode().startsWith("🎲") ||
		disableThread ||
		rollChannel === channel.id
	) {
		return await reply(interaction, {
			allowedMentions,
			content: output,
			flags: hidden ? Djs.MessageFlags.Ephemeral : undefined,
		});
	}

	if (interaction.guild) {
		const thread = await threadToSend(
			settings,
			interaction.channel as Djs.TextChannel,
			ul,
			isHidden
		);
		const forwarded = await thread.send("_ _");
		const linkToLog = settings.get(interaction.guild!.id, "linkToLogs");
		const logUrl = linkToLog ? forwarded.url : undefined;
		const outputWithUrl =
			result.roll?.logUrl(logUrl)?.result ??
			`${result.expression}${createUrl(ul, undefined, logUrl)}`;
		const replyInteraction = await reply(interaction, {
			allowedMentions,
			content: outputWithUrl,
			flags: hidden ? Djs.MessageFlags.Ephemeral : undefined,
		});
		const anchor = settings.get(interaction.guild!.id, "context");
		const dbTime = settings.get(interaction.guild!.id, "deleteAfter");
		const timer = dbTime ? dbTime : 180000;
		let messageId: string | undefined;
		if (anchor && !channel.isDMBased()) {
			messageId = replyInteraction.id;
			if (timer && timer > 0) {
				const messageBefore = await findMessageBefore(
					channel,
					replyInteraction,
					interaction.client
				);
				if (messageBefore) messageId = messageBefore.id;
			}
			const ctx = {
				channelId: channel.id,
				guildId: interaction.guild!.id,
				messageId,
			};
			const res =
				result.roll?.context(ctx).result ?? `${result.expression}${createUrl(ul, ctx)}`;
			await forwarded.edit(res);
		} else await forwarded.edit(output as string);
		if (!disableThread) await deleteAfter(replyInteraction, timer);
	}
}
