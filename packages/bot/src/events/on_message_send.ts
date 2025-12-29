import { fetchChannel, getGuildContext } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { lError, ln } from "@dicelette/localization";
import {
	buildInfoRollFromStats,
	isRolling,
	parseComparator,
	rollCustomCriticalsFromDice,
} from "@dicelette/parse_result";
import {
	allValuesUndefined,
	CHARACTER_DETECTION,
	logger,
	profiler,
	REMOVER_PATTERN,
	sentry,
	triggerPity,
} from "@dicelette/utils";
import { getCharFromText, getUserFromMessage } from "database";
import * as Djs from "discord.js";
import { handleRollResult, saveCount, stripOOC } from "messages";
import { getCritical } from "utils";
import { isApiError } from "./on_error";

export default (client: EClient): void => {
	client.on("messageCreate", async (message) => {
		try {
			profiler.startProfiler();
			if (message.channel.type === Djs.ChannelType.DM) return;
			if (!message.guild) return;
			const userLang =
				client.guildLocale?.get(message.guild.id) ??
				client.settings.get(message.guild.id, "lang") ??
				message.guild.preferredLocale ??
				Djs.Locale.EnglishUS;
			const ul = ln(userLang);

			if (message.author.bot && message.author.id === client.user?.id)
				return saveCount(message, client.criticalCount, message.guild.id, client);
			let content = message.content;
			if (message.content.match(/^`.*`$/)) return await stripOOC(message, client, ul);
			let author = message.author;
			if (message.member?.permissions.has(Djs.PermissionFlagsBits.ManageRoles)) {
				//verify if they are any mentions
				if (message.mentions.users.size > 0) {
					author = message.mentions.users.first()!;
					content = content.replaceAll(`<@${author.id}>`, "").trim();
				}
			}

			let firstChara: string | undefined;
			if (content.match(REMOVER_PATTERN.STAT_MATCHER))
				firstChara = await getCharFromText(client, message.guild.id, author.id, content);
			if (firstChara) content = content.replace(CHARACTER_DETECTION, "").trim();
			const data = await getUserFromMessage(client, author.id, message, firstChara, {
				skipNotFound: true,
			});
			const userData = data?.userData;
			let charName = data?.charName ?? firstChara;

			if (!charName && content.match(CHARACTER_DETECTION)) {
				charName = content.match(CHARACTER_DETECTION)![1];
				content = content.replace(CHARACTER_DETECTION, "").trim();
			}
			const ctx = getGuildContext(client, message.guild.id);
			const statsName = ctx?.templateID?.statsName ?? [];
			const pityNb = client.criticalCount.get(message.guild.id, author.id)?.consecutive
				?.failure;
			const pityThreshold = client.settings.get(message.guild.id, "pity");
			const pity = triggerPity(pityThreshold, pityNb);
			logger.trace("Should be pity?", { pity, pityNb, pityThreshold });
			const isRoll = isRolling(content, userData, statsName, pity);

			if (!isRoll || allValuesUndefined(isRoll))
				return await stripOOC(message, client, ul);
			const { result, detectRoll, infoRoll, statsPerSegment } = isRoll;
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
				statsPerSegment,
				ul,
				user: author,
			});
			return;
		} catch (e) {
			if (!message.guild) return;
			if (!isApiError(e)) {
				logger.fatal(e);
				sentry.fatal(e);
			}
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
		} finally {
			profiler.stopProfiler();
		}
	});
};
