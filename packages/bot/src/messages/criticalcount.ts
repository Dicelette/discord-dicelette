import type { EClient } from "@dicelette/client";
import { findln } from "@dicelette/localization";
import { type Count, type CriticalCount, IGNORE_COUNT_KEY } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type * as Djs from "discord.js";

import { createCacheKey } from "../commands";

/**
 * Get if the message is a success or a failure
 * @param message {Djs.Message} The message to check
 * @returns {"failure" | "success"} The type of the message
 * @example of template
 * - Simple message : `  Succès — 1d100 ⟶ [67] = [67] > 20`
 */
function getTypeFroMessage(message: Djs.Message | Djs.PartialMessage): Count {
	const count: Count = {
		criticalFailure: 0,
		criticalSuccess: 0,
		failure: 0,
		success: 0,
	};
	if (!message.content) return count;
	if (message.content.includes(IGNORE_COUNT_KEY.emoji)) return count;
	const msgs = message.content.split("\n");

	if (!msgs.length) return count;
	for (const msg of msgs) {
		const word = msg.trim();
		const firstWord = /^\s*(?:_ _\s*|\s{2,})?\*{2}(.*?)\*{2}/.exec(word)?.[1];
		if (!firstWord) continue;
		const find = findln(firstWord.toLowerCase());
		if (find) {
			switch (find) {
				case "roll.critical.success":
					count.criticalSuccess++;
					count.success++;
					break;
				case "roll.success":
					count.success++;
					break;
				case "roll.critical.failure":
					count.criticalFailure++;
					count.failure++;
					break;
				case "common.failure":
				case "roll.failure":
					count.failure++;
					break;
			}
		}
	}
	return count;
}

export function getAuthor(message: Djs.Message | Djs.PartialMessage): string | undefined {
	if (message.interactionMetadata?.user && !message.content)
		return message.interactionMetadata.user.id;
	if (!message.content) return undefined;
	const regAuthor = /\*<?@(.*?)>?\*/;
	const match = regAuthor.exec(message.content);
	return match ? match?.[1] : undefined;
}

function addCount(
	criticalCount: CriticalCount,
	userId: string,
	guildId: string,
	messageCount: Count,
	isTrivial = false
) {
	const existingCount = criticalCount.get(guildId, userId);
	if (!existingCount) {
		criticalCount.set(guildId, messageCount, userId);
		return;
	}

	const newCount: Count = {
		criticalFailure: existingCount.criticalFailure + messageCount.criticalFailure,
		criticalSuccess: existingCount.criticalSuccess + messageCount.criticalSuccess,
		failure: existingCount.failure + messageCount.failure,
		success: existingCount.success + messageCount.success,
	};

	// We should ignore the consecutive if the comparison is trivial (as it will be always a success or fail)
	if (isTrivial) {
		newCount.consecutive = existingCount.consecutive ?? { failure: 0, success: 0 };
		newCount.longestStreak = existingCount.longestStreak ?? { failure: 0, success: 0 };
	} else if (messageCount.failure || messageCount.criticalFailure) {
		newCount.consecutive = {
			failure:
				(existingCount.consecutive?.failure ?? 0) +
				messageCount.failure +
				messageCount.criticalFailure,
			success: 0,
		};
		newCount.longestStreak = {
			failure: Math.max(
				existingCount.longestStreak?.failure ?? 0,
				newCount.consecutive.failure
			),
			success: existingCount.longestStreak?.success ?? 0,
		};
	} else {
		newCount.consecutive = {
			failure: 0,
			success:
				(existingCount.consecutive?.success ?? 0) +
				messageCount.success +
				messageCount.criticalSuccess,
		};
		newCount.longestStreak = {
			failure: existingCount.longestStreak?.failure ?? 0,
			success: Math.max(
				existingCount.longestStreak?.success ?? 0,
				newCount.consecutive.success
			),
		};
	}
	logger.trace(
		`Saving new count for user ${userId} in guild ${guildId} ${JSON.stringify(newCount)}`
	);
	criticalCount.set(guildId, newCount, userId);
}

function removeCount(
	criticalCount: CriticalCount,
	userId: string,
	guildId: string,
	messageCount: Count,
	isTrivial = false
) {
	const existingCount = criticalCount.get(guildId, userId);
	if (!existingCount) return; //we can't remove what doesn't exist

	const consecutive = existingCount.consecutive ?? { failure: 0, success: 0 };
	const newConsecutive = isTrivial
		? consecutive
		: {
				// We remove only if we are in the consecutive serie
				failure:
					consecutive.failure > 0
						? Math.max(
								0,
								consecutive.failure - messageCount.failure - messageCount.criticalFailure
							)
						: 0,
				success:
					consecutive.success > 0
						? Math.max(
								0,
								consecutive.success - messageCount.success - messageCount.criticalSuccess
							)
						: 0,
			};

	const newCount: Count = {
		consecutive: newConsecutive,
		criticalFailure: Math.max(
			0,
			existingCount.criticalFailure - messageCount.criticalFailure
		),
		criticalSuccess: Math.max(
			0,
			existingCount.criticalSuccess - messageCount.criticalSuccess
		),
		failure: Math.max(0, existingCount.failure - messageCount.failure),
		// longestStreak is a historical record; it is not modified during deletions.
		longestStreak: existingCount.longestStreak ?? { failure: 0, success: 0 },
		success: Math.max(0, existingCount.success - messageCount.success),
	};
	criticalCount.set(guildId, newCount, userId);
}

export function saveCount(
	message: Djs.Message | Djs.PartialMessage,
	criticalCount: CriticalCount,
	guildId: string,
	client: EClient,
	type: "add" | "remove" = "add"
) {
	const count = getTypeFroMessage(message);
	let userId = getAuthor(message);
	if (!userId) return;

	//verify that the user is not a bot
	const author = message.client.users.cache.get(userId);
	if (!author) userId = message.client.user?.id ?? "0";
	const pity = client.settings.get(guildId, "pity");
	let isTrivial = false;
	//only check the cache if pity is enabled
	if (pity) {
		// Check if this roll has a trivial comparison
		//use a cache + a prev key around the minute
		const { cacheKey, prevCacheKey, timeMin } = createCacheKey(message, userId);
		const trivialCache = client.trivialCache;
		isTrivial = trivialCache.has(cacheKey) || trivialCache.has(prevCacheKey);
		logger.trace("Is trivial?", { cacheKey, isTrivial, messageTimestamp: timeMin });
	}
	if (type === "add") addCount(criticalCount, userId, guildId, count, isTrivial);
	else removeCount(criticalCount, userId, guildId, count, isTrivial);
}
