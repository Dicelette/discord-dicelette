import { lError, ln } from "@dicelette/localization";
import {
	isRolling,
	ResultAsText,
	rollCustomCriticalsFromDice,
} from "@dicelette/parse_result";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { deleteAfter, findMessageBefore, threadToSend } from "messages";
import { fetchChannel } from "../utils";
import { logger } from "@dicelette/utils";

export default (client: EClient): void => {
	client.on("messageCreate", async (message) => {
		try {
			if (message.author.bot) return;
			if (message.channel.type === Djs.ChannelType.DM) return;
			if (!message.guild) return;
			const content = message.content;
			//detect roll between bracket
			const isRoll = isRolling(content);
			if (!isRoll) return;
			const { result, detectRoll } = isRoll;
			const deleteInput = !detectRoll;

			//is a valid roll as we are in the function so we can work as always
			const userLang =
				client.guildLocale?.get(message.guild.id) ??
				client.settings.get(message.guild.id, "lang") ??
				message.guild.preferredLocale ??
				Djs.Locale.EnglishUS;
			const ul = ln(userLang);
			const channel = message.channel;
			if (!result) return;
			const critical = rollCustomCriticalsFromDice(content, ul);
			const resultAsText = new ResultAsText(
				result,
				{ lang: userLang },
				undefined,
				undefined,
				undefined,
				critical
			);
			const parser = resultAsText.parser;
			if (!parser) return;
			if (
				channel.name.decode().startsWith("🎲") ||
				client.settings.get(message.guild.id, "disableThread") === true ||
				client.settings.get(message.guild.id, "rollChannel") === channel.id
			) {
				await message.reply({
					content: parser,
					allowedMentions: { repliedUser: true },
				});
				return;
			}
			let context = {
				guildId: message.guildId ?? "",
				channelId: channel.id,
				messageId: message.id,
			};
			if (deleteInput) {
				if (client.settings.get(message.guild.id, "context")) {
					const messageBefore = await findMessageBefore(channel, message, client);
					if (messageBefore)
						context = {
							guildId: message.guildId ?? "",
							channelId: channel.id,
							messageId: messageBefore.id,
						};
				}
			}
			const thread = await threadToSend(client.settings, channel, ul);
			const msgToEdit = await thread.send("_ _");
			const msg = resultAsText.onMessageSend(context, message.author.id);
			await msgToEdit.edit(msg);
			const idMessage = client.settings.get(message.guild.id, "linkToLogs")
				? msgToEdit.url
				: undefined;
			const reply = deleteInput
				? await channel.send({
						content: resultAsText.onMessageSend(idMessage, message.author.id),
					})
				: await message.reply({
						content: resultAsText.onMessageSend(idMessage),
						allowedMentions: { repliedUser: true },
					});
			const timer = client.settings.get(message.guild.id, "deleteAfter") ?? 180000;
			await deleteAfter(reply, timer);
			if (deleteInput) await message.delete();
			return;
		} catch (e) {
			logger.error("\n", e);
			if (!message.guild) return;
			const userLang =
				client.settings.get(message.guild.id, "lang") ??
				message.guild.preferredLocale ??
				Djs.Locale.EnglishUS;
			const msgError = lError(e as Error, undefined, userLang);
			if (msgError.length === 0) return;
			await message.channel.send({ content: msgError });
			const logsId = client.settings.get(message.guild.id, "logs");
			if (logsId) {
				const logs = await fetchChannel(message.guild, logsId);
				if (logs instanceof Djs.TextChannel) {
					await logs.send(`\`\`\`\n${(e as Error).message}\n\`\`\``);
				}
			}
		}
	});
};
