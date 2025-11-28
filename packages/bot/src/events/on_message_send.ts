import { fetchChannel, getGuildContext } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { lError, ln } from "@dicelette/localization";
import {
	buildInfoRollFromStats,
	isRolling,
	parseComparator,
	rollCustomCriticalsFromDice,
} from "@dicelette/parse_result";
import { allValuesUndefined, logger } from "@dicelette/utils";
import { getCharFromText, getUserFromMessage } from "database";
import * as Djs from "discord.js";
import { handleRollResult, saveCount, stripOOC } from "messages";
import { getCritical } from "utils";
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
			const ctx = getGuildContext(client, message.guild.id);
			const statsName = ctx?.templateID?.statsName ?? [];
			const isRoll = isRolling(content, userData, statsName);

			if (!isRoll || allValuesUndefined(isRoll))
				return await stripOOC(message, client, ul);
			const { result, detectRoll, infoRoll } = isRoll;
			const deleteInput = !detectRoll;
			if (!result) return;
			const { criticalsFromDice, serverData } = await getCritical(
				client,
				ul,
				result.dice,
				message.guild,
				userData,
				rollCustomCriticalsFromDice(content, ul)
			);

			const opposition = parseComparator(content, userData?.stats, infoRoll);

			// Build infoRoll using helper to recover original accented name if available
			const formattedInfoRoll = buildInfoRollFromStats(
				infoRoll ? [infoRoll] : undefined,
				statsName
			);

			// Use the unified roll handler
			await handleRollResult({
				charName,
				client,
				criticalsFromDice,
				deleteInput,
				infoRoll: formattedInfoRoll,
				lang: userLang,
				opposition,
				result,
				serverCritical: serverData?.critical,
				source: message,
				ul,
			});
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
