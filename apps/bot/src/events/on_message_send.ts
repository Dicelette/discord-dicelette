import type { EClient } from "@dicelette/client";
import { DiceTypeError, REMOVER_PATTERN } from "@dicelette/core";
import { fetchChannel, getGuildContext } from "@dicelette/helpers";
import { lError, ln } from "@dicelette/localization";
import {
	isRolling,
	parseComparator,
	rollCustomCriticalsFromDice,
} from "@dicelette/parse_result";
import {
	allValuesUndefined,
	CHARACTER_DETECTION,
	logger,
	profiler,
	sentry,
} from "@dicelette/utils";
import { getCharFromText, getUserFromMessage } from "database";
import * as Djs from "discord.js";
import { handleRollResult, saveCount, stripOOC } from "messages";
import { getCritical } from "utils";
import { triggerPity } from "../commands";
import { isApiError } from "./on_error";

export default (client: EClient): void => {
	client.on("messageCreate", async (message) => {
		try {
			profiler.startProfiler();
			if (message.channel.type === Djs.ChannelType.DM) return;
			if (!message.guild) return;
			// Single Enmap read instead of 4 path-based reads: each .get(id, path) runs
			// a separate SQL SELECT + JSON parse on the Enmap-backed store.
			const guildSettings = client.settings.get(message.guild.id);
			const userLang =
				client.guildLocale?.get(message.guild.id) ??
				guildSettings?.lang ??
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
				attributes: true,
				skipNotFound: true,
			});
			const userData = data?.userData;
			let charName = data?.charName ?? firstChara;

			if (!charName && content.match(CHARACTER_DETECTION)) {
				charName = content.match(CHARACTER_DETECTION)![1];
				content = content.replace(CHARACTER_DETECTION, "").trim();
			}
			const ctx = getGuildContext(client, message.guild.id);
			const statsName =
				userData?.displayStats && userData.displayStats.length > 0
					? userData.displayStats
					: ctx?.templateID?.statsName;
			logger.trace("Stats name:", statsName, "User stats:", userData?.stats);
			const pityNb = client.criticalCount.get(message.guild.id, author.id)?.consecutive
				?.failure;
			const pityThreshold = guildSettings?.pity || undefined;
			const pity = triggerPity(pityThreshold, pityNb);
			const disableCompare = guildSettings?.disableCompare || undefined;
			const sortOrder = guildSettings?.sortOrder || undefined;
			const isRoll = isRolling(
				content,
				userData,
				statsName,
				pity,
				disableCompare,
				sortOrder,
				ul,
				client.userSettings.get(message.guild.id, message.author.id)?.ignoreNotfound
			);

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
				rollCustomCriticalsFromDice(content, ul, undefined, userData?.stats, sortOrder),
				sortOrder
			);

			const opposition = parseComparator(content, userData?.stats, infoRoll, sortOrder);

			const formattedInfoRoll = infoRoll
				? { name: infoRoll, standardized: infoRoll.standardize() }
				: undefined;

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
			if (!isApiError(e) && !(e instanceof DiceTypeError)) {
				logger.fatal(e);
				sentry.fatal(e);
			}
			const guildSettings = client.settings.get(message.guild.id);
			const userLang =
				guildSettings?.lang ?? message.guild.preferredLocale ?? Djs.Locale.EnglishUS;
			const msgError = lError(e as Error, undefined, userLang);
			if (msgError.length === 0) return;
			//await message.channel.send({ content: msgError });
			await message.author.send({ content: msgError });

			const logsId = guildSettings?.logs;
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
