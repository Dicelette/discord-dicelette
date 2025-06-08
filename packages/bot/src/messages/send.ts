import { createUrl, type ResultAsText } from "@dicelette/parse_result";
import type { Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { embedError, findMessageBefore, threadToSend } from "messages";
import { lError } from "@dicelette/localization";
import { isValidChannel, fetchChannel } from "utils";
import type { EClient } from "../client";

export async function sendLogs(
	message: string,
	guild: Djs.Guild,
	db: Settings,
) {
	const guildData = db.get(guild.id);
	if (!guildData?.logs) return;
	const channel = guildData.logs;
	try {
		const channelToSend = (await fetchChannel(
			guild,
			channel,
		)) as Djs.TextChannel;
		await channelToSend.send({ content: message, allowedMentions: {} });
	} catch (error) {
		return;
	}
}
export async function reply(
	interaction:
		| Djs.CommandInteraction
		| Djs.ModalSubmitInteraction
		| Djs.ButtonInteraction
		| Djs.StringSelectMenuInteraction,
	options: string | Djs.MessagePayload | Djs.InteractionReplyOptions,
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
		console.error("\n", e);
		return await interaction.followUp(options);
	}
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
	time: number,
): Promise<void> {
	if (time === 0) return;

	setTimeout(async () => {
		try {
			await message.delete();
		} catch (error) {
			// Can't delete message, probably because the message was already deleted; ignoring the error.
		}
	}, time);
}

export function displayOldAndNewStats(
	oldStats?: Djs.APIEmbedField[],
	newStats?: Djs.APIEmbedField[],
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
	hide?: boolean | null,
) {
	let channel = interaction.channel;
	if (!isValidChannel(channel, interaction)) return;
	channel = channel as
		| Djs.TextChannel
		| Djs.PrivateThreadChannel
		| Djs.PublicThreadChannel<boolean>;

	const disableThread = settings.get(interaction.guild!.id, "disableThread");
	let rollChannel = settings.get(interaction.guild!.id, "rollChannel");
	const hideResultConfig = settings.get(interaction.guild!.id, "hiddenRoll") as
		| string
		| boolean
		| undefined;
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
				content: output,
				flags: Djs.MessageFlags.Ephemeral,
				allowedMentions,
			});
		}
	}
	if (
		channel.name.decode().startsWith("🎲") ||
		disableThread ||
		rollChannel === channel.id
	) {
		return await reply(interaction, {
			content: output,
			allowedMentions,
			flags: hidden ? Djs.MessageFlags.Ephemeral : undefined,
		});
	}

	const thread = await threadToSend(
		settings,
		interaction.channel as Djs.TextChannel,
		ul,
		isHidden,
	);
	const forwarded = await thread.send("_ _");
	const linkToLog = settings.get(interaction.guild!.id, "linkToLogs");
	const logUrl = linkToLog ? forwarded.url : undefined;
	const outputWithUrl =
		result.roll?.logUrl(logUrl)?.result ??
		`${result.expression}${createUrl(ul, undefined, logUrl)}`;
	const replyInteraction = await reply(interaction, {
		content: outputWithUrl,
		allowedMentions,
		flags: hidden ? Djs.MessageFlags.Ephemeral : undefined,
	});
	const anchor = settings.get(interaction.guild!.id, "context");
	const dbTime = settings.get(interaction.guild!.id, "deleteAfter");
	const timer = dbTime ? dbTime : 180000;
	let messageId;
	if (anchor) {
		messageId = replyInteraction.id;
		if (timer && timer > 0) {
			const messageBefore = await findMessageBefore(
				channel,
				replyInteraction,
				interaction.client,
			);
			if (messageBefore) messageId = messageBefore.id;
		}
		const ctx = {
			guildId: interaction.guild!.id,
			channelId: channel.id,
			messageId,
		};
		const res =
			result.roll?.context(ctx).result ??
			`${result.expression}${createUrl(ul, ctx)}`;
		await forwarded.edit(res);
	} else await forwarded.edit(output as string);
	if (!disableThread) await deleteAfter(replyInteraction, timer);
}

export async function interactionError(
	client: EClient,
	interaction: Djs.BaseInteraction,
	e: Error,
	ul: Translation,
	langToUse?: Djs.Locale,
) {
	console.error("\n", e);
	if (!interaction.guild) return;
	const msgError = lError(e as Error, interaction, langToUse);
	if (msgError.length === 0) return;
	const cause = (e as Error).cause ? ((e as Error).cause as string) : undefined;
	const embed = embedError(msgError, ul, cause);
	if (
		interaction.isButton() ||
		interaction.isModalSubmit() ||
		interaction.isCommand()
	)
		await reply(interaction, {
			embeds: [embed],
			flags: Djs.MessageFlags.Ephemeral,
		});
	if (client.settings.has(interaction.guild.id)) {
		const db = client.settings.get(interaction.guild.id, "logs");
		if (!db) return;
		const logs = (await fetchChannel(
			interaction.guild!,
			db,
		)) as Djs.GuildBasedChannel;
		if (logs instanceof Djs.TextChannel) {
			await logs.send(`\`\`\`\n${(e as Error).message}\n\`\`\``);
		}
	}
}
