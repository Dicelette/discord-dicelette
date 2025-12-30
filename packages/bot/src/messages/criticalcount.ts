import type { EClient } from "@dicelette/client";
import { findln } from "@dicelette/localization";
import { type Count, type CriticalCount, IGNORE_COUNT_KEY } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type * as Djs from "discord.js";
import { clearCacheKey, createCacheKey } from "../commands";

/**
 * Extracts counts of critical and regular successes and failures from a Discord message's content.
 *
 * @param message - The Discord message to parse for roll outcome lines (Djs.Message or Djs.PartialMessage).
 * @returns A Count object with `criticalFailure`, `criticalSuccess`, `failure`, and `success` fields representing the number of occurrences found in the message content.
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

/**
 * Extracts the author user ID from a Discord message, if present.
 *
 * @param message - The message to inspect for an author identifier
 * @returns The extracted user ID if found, `undefined` otherwise
 */
export function getAuthor(message: Djs.Message | Djs.PartialMessage): string | undefined {
	if (message.interactionMetadata?.user && !message.content)
		return message.interactionMetadata.user.id;
	if (!message.content) return undefined;
	const regAuthor = /\*<?@(.*?)>?\*/;
	const match = regAuthor.exec(message.content);
	return match?.[1];
}

/**
 * Update a user's cumulative counts for a guild by adding the provided message counts and adjusting consecutive and longest streaks.
 *
 * @param criticalCount - Store managing per-guild/per-user counts
 * @param userId - ID of the user to update
 * @param guildId - ID of the guild where the counts apply
 * @param messageCount - Counts extracted from a single message to add
 * @param isTrivial - When true, preserve existing consecutive and longestStreak values (do not modify streaks)
 */
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
			failure: (existingCount.consecutive?.failure ?? 0) + messageCount.failure,
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
			success: (existingCount.consecutive?.success ?? 0) + messageCount.success,
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

/**
 * Subtracts a message's counts from a user's stored counts for a guild.
 *
 * Adjusts the user's cumulative fields (criticalFailure, criticalSuccess, failure, success)
 * by subtracting the provided `messageCount`, clamps each field at zero, and updates
 * the stored consecutive values unless `isTrivial` is true. The historical `longestStreak`
 * is preserved and not modified by removals. If no existing record is found for the user
 * in the guild, the function returns without effect.
 *
 * @param criticalCount - The per-guild/per-user counts store to update.
 * @param userId - The user identifier whose counts will be decreased.
 * @param guildId - The guild identifier where the counts are stored.
 * @param messageCount - The counts to subtract from the stored totals.
 * @param isTrivial - When true, preserve existing `consecutive` values and do not adjust streak logic.
 */
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
						? Math.max(0, consecutive.failure - messageCount.failure)
						: 0,
				success:
					consecutive.success > 0
						? Math.max(0, consecutive.success - messageCount.success)
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

/**
 * Compute outcome counts from a message and update the per-guild user critical counts store.
 *
 * Determines the author for the message, computes the count of successes/failures (including criticals),
 * checks the guild's "pity" setting and a per-user trivial-roll cache to decide whether the update is trivial,
 * and then either adds to or removes from the provided CriticalCount store.
 *
 * @param message - The Discord message to analyze for roll outcomes
 * @param criticalCount - The per-guild/per-user counts store to update
 * @param guildId - The guild identifier where the message originated
 * @param client - The bot client (used to read settings and the trivial-roll cache)
 * @param type - Whether to add the computed counts to the store or remove them (`"add"` or `"remove"`)
 */
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
		// Check both the current minute's cache key and the previous minute's key to handle edge cases around minute boundaries.
		const { cacheKey, prevCacheKey, timeMin } = createCacheKey(message, userId);
		const trivialCache = client.trivialCache;
		isTrivial = trivialCache.has(cacheKey) || trivialCache.has(prevCacheKey);
		logger.trace("Is trivial?", { cacheKey, isTrivial, messageTimestamp: timeMin });
		if (isTrivial) clearCacheKey(message, userId, client);
	}
	if (type === "add") addCount(criticalCount, userId, guildId, count, isTrivial);
	else removeCount(criticalCount, userId, guildId, count, isTrivial);
}
