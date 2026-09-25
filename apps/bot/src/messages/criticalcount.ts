import type { EClient } from "@dicelette/client";
import { findln } from "@dicelette/localization";
import { type Count, type CriticalCount, IGNORE_COUNT_KEY } from "@dicelette/types";
import { ROLL_MENTION_PATTERN } from "@dicelette/utils";
import type * as Djs from "discord.js";
import { clearCacheKey, createCacheKey } from "../commands";

/** Counts critical/regular successes and failures from a Discord message's content. */
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

/** Extracts the author's user ID from a Discord message, if present. */
export function getAuthor(message: Djs.Message | Djs.PartialMessage): string | undefined {
	if (message.interactionMetadata?.user && !message.content)
		return message.interactionMetadata.user.id;
	if (!message.content) return undefined;
	return ROLL_MENTION_PATTERN.exec(message.content)?.groups?.id;
}

/** Adds a message's counts to a user's cumulative guild counts, updating consecutive/longest streaks (unless `isTrivial`). */
export function addCount(
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
	} else if (messageCount.success || messageCount.criticalSuccess) {
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
	} else {
		newCount.consecutive = existingCount.consecutive ?? { failure: 0, success: 0 };
		newCount.longestStreak = existingCount.longestStreak ?? { failure: 0, success: 0 };
	}

	criticalCount.set(guildId, newCount, userId);
}

/** Subtracts a message's counts from a user's cumulative guild counts, adjusting consecutive streaks (unless `isTrivial`). */
function removeCount(
	criticalCount: CriticalCount,
	userId: string,
	guildId: string,
	messageCount: Count,
	isTrivial = false
) {
	const existingCount = criticalCount.get(guildId, userId);
	if (!existingCount) return; // Nothing stored yet, nothing to remove.

	const consecutive = existingCount.consecutive ?? { failure: 0, success: 0 };
	const newConsecutive = isTrivial
		? consecutive
		: {
				// Only decrement while still inside the active streak.
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

/** Computes success/failure counts from a message and updates the guild's critical-count store, treating the
 * roll as trivial if it's cached as such (per the guild's pity setting). */
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

	// Fall back to the bot's own ID if the author can't be resolved from cache.
	const author = message.client.users.cache.get(userId);
	if (!author) userId = message.client.user?.id ?? "0";
	const pity = client.settings.get(guildId, "pity");
	let isTrivial = false;
	if (pity) {
		// Checks both the current and previous minute's cache key, to handle edge cases around minute boundaries.
		const { cacheKey, prevCacheKey } = createCacheKey(message, userId);
		const trivialCache = client.trivialCache;
		isTrivial = trivialCache.has(cacheKey) || trivialCache.has(prevCacheKey);
		if (isTrivial) clearCacheKey(message, userId, client);
	}
	if (type === "add") addCount(criticalCount, userId, guildId, count, isTrivial);
	else removeCount(criticalCount, userId, guildId, count, isTrivial);
}
