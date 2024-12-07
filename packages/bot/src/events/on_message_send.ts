import { lError, ln } from "@dicelette/localization";
import { ResultAsText, isRolling, rollContent } from "@dicelette/parse_result";
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { deleteAfter, findMessageBefore, threadToSend } from "messages";

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
				client.settings.get(message.guild.id, "lang") ??
				message.guild.preferredLocale ??
				Djs.Locale.EnglishUS;
			const ul = ln(userLang);
			const channel = message.channel;
			if (!result) return;
			const resultAsText = new ResultAsText(result, { lang: userLang });
			const parser = resultAsText.parser;
			if (!parser) return;
			if (
				channel.name.startsWith("🎲") ||
				client.settings.get(message.guild.id, "disableThread") === true ||
				client.settings.get(message.guild.id, "rollChannel") === channel.id
			) {
				await message.reply({ content: parser, allowedMentions: { repliedUser: true } });
				return;
			}
			let linkToOriginal = "";
			if (deleteInput) {
				if (client.settings.get(message.guild.id, "context")) {
					const messageBefore = await findMessageBefore(channel, message, client);
					if (messageBefore)
						linkToOriginal = resultAsText.createUrl({
							guildId: message.guildId ?? "",
							channelId: channel.id,
							messageId: messageBefore.id,
						});
				}
			} else {
				linkToOriginal = resultAsText.createUrl({
					guildId: message.guildId ?? "",
					channelId: channel.id,
					messageId: message.id,
				});
			}
			const thread = await threadToSend(client.settings, channel, ul);
			const msgToEdit = await thread.send("_ _");
			const msg = rollContent(
				result,
				parser,
				linkToOriginal,
				message.author.id,
				client.settings.get(message.guild.id, "timestamp")
			);
			await msgToEdit.edit(msg);
			const idMessage = client.settings.get(message.guild.id, "linkToLogs")
				? resultAsText.createUrl(undefined, msgToEdit.url)
				: "";
			const reply = deleteInput
				? await channel.send({
						content: rollContent(result, parser, idMessage, message.author.id),
					})
				: await message.reply({
						content: rollContent(result, parser, idMessage),
						allowedMentions: { repliedUser: true },
					});
			const timer = client.settings.get(message.guild.id, "deleteAfter") ?? 180000;
			await deleteAfter(reply, timer);
			if (deleteInput) await message.delete();
			return;
		} catch (e) {
			logger.error(e);
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
				const logs = await message.guild.channels.fetch(logsId);
				if (logs instanceof Djs.TextChannel) {
					await logs.send(`\`\`\`\n${(e as Error).message}\n\`\`\``);
				}
			}
		}
	});
};
