import { lError, ln } from "@dicelette/localization";
import {
	isRolling,
	parseComparator,
	ResultAsText,
	rollCustomCriticalsFromDice,
} from "@dicelette/parse_result";
import type { DiscordTextChannel } from "@dicelette/types";
import { allValuesUndefined, logger } from "@dicelette/utils";
import type { EClient } from "client";
import { getCharFromText, getUserFromMessage } from "database";
import * as Djs from "discord.js";
import {
	deleteAfter,
	findMessageBefore,
	saveCount,
	stripOOC,
	threadToSend,
} from "messages";
import { fetchChannel, getCritical } from "utils";
import { isApiError } from "./on_error";

export default (client: EClient): void => {
	client.on("messageCreate", async (message) => {
		try {
			if (message.channel.type === Djs.ChannelType.DM) return;
			if (!message.guild) return;
			const userLang =
				client.guildLocale?.get(message.guild.id) ??
				client.settings.get(message.guild.id, "lang") ??
				message.guild.preferredLocale ??
				Djs.Locale.EnglishUS;
			const ul = ln(userLang);

			if (message.author.bot && message.author.id === client.user?.id)
				return saveCount(message, client.criticalCount, message.guild.id);
			let content = message.content;
			if (message.content.match(/`.*`/)) return await stripOOC(message, client, ul);
			//detect roll between bracket
			let firstChara: string | undefined;
			if (content.match(/\$([a-zA-Z_][a-zA-Z0-9_]*)/))
				firstChara = await getCharFromText(
					client,
					message.guild.id,
					message.author.id,
					content
				);
			if (firstChara) content = content.replace(/ @\w+/, "").trim();
			const data = await getUserFromMessage(
				client,
				message.author.id,
				message,
				firstChara,
				{ skipNotFound: true }
			);
			const userData = data?.userData;
			let charName = data?.charName ?? firstChara;

			if (!charName && content.match(/ @\w+/)) {
				charName = content.match(/ @(\w+)/)![1];
				content = content.replace(/ @\w+/, "").trim();
			}

			const isRoll = isRolling(content, userData);

			if (!isRoll || allValuesUndefined(isRoll))
				return await stripOOC(message, client, ul);
			const { result, detectRoll } = isRoll;
			const deleteInput = !detectRoll;
			const channel = message.channel;
			if (!result) return;
			const { criticalsFromDice, serverData } = await getCritical(
				client,
				ul,
				result.dice,
				message.guild,
				userData,
				rollCustomCriticalsFromDice(content, ul)
			);

			const opposition = parseComparator(content, userData?.stats, isRoll.infoRoll);

			const resultAsText = new ResultAsText(
				result,
				{ lang: userLang },
				serverData?.critical,
				charName,
				undefined,
				criticalsFromDice,
				opposition
			);
			const parser = resultAsText.parser;
			if (!parser) return;
			const isRollChannel =
				client.settings.get(message.guild.id, "rollChannel") === channel.id ||
				channel.name.decode().startsWith("🎲");

			if (client.settings.get(message.guild.id, "disableThread") === true) {
				await replyDice(deleteInput, message, resultAsText);
				if (deleteInput) await message.delete();
				return;
			}

			if (isRollChannel) {
				return await message.reply({
					allowedMentions: { repliedUser: true },
					content: parser,
				});
			}

			let context = {
				channelId: channel.id,
				guildId: message.guildId ?? "",
				messageId: message.id,
			};
			if (deleteInput && client.settings.get(message.guild.id, "context")) {
				const messageBefore = await findMessageBefore(channel, message, client);
				if (messageBefore)
					context = {
						channelId: channel.id,
						guildId: message.guildId ?? "",
						messageId: messageBefore.id,
					};
			}
			const thread = await threadToSend(client.settings, channel, ul);
			const msgToEdit = await thread.send("_ _");
			const msg = resultAsText.onMessageSend(context, message.author.id);
			await msgToEdit.edit(msg);
			const idMessage = client.settings.get(message.guild.id, "linkToLogs")
				? msgToEdit.url
				: undefined;
			const reply = await replyDice(deleteInput, message, resultAsText, idMessage);
			const timer = client.settings.get(message.guild.id, "deleteAfter") ?? 180000;
			await deleteAfter(reply, timer);
			if (deleteInput) await message.delete();
			return;
		} catch (e) {
			if (!message.guild) return;
			if (!isApiError(e)) logger.fatal(e);
			const userLang =
				client.settings.get(message.guild.id, "lang") ??
				message.guild.preferredLocale ??
				Djs.Locale.EnglishUS;
			const msgError = lError(e as Error, undefined, userLang);
			if (msgError.length === 0) return;
			//await message.channel.send({ content: msgError });
			await message.author.send({ content: msgError });

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

async function replyDice(
	deleteInput: boolean,
	message: Djs.Message,
	resultAsText: ResultAsText,
	idMessage?: string
) {
	const channel = message.channel as DiscordTextChannel;
	return deleteInput
		? await channel.send({
				content: resultAsText.onMessageSend(idMessage, message.author.id),
			})
		: await message.reply({
				allowedMentions: { repliedUser: true },
				content: resultAsText.onMessageSend(idMessage),
			});
}
