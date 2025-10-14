import { findln } from "@dicelette/localization";
import type { Count, CriticalCount } from "@dicelette/types";
import type * as Djs from "discord.js";

/**
 * Get if the message is a success or a failure
 * @param message {Djs.Message} The message to check
 * @returns {"failure" | "success"} The type of the message
 * @example of template
 * - Simple message : `  Succès — 1d100 ⟶ [67] = [67] > 20`
 */
function getTypeFroMessage(message: Djs.Message | Djs.PartialMessage): Count {
	if (!message.content)
		return { success: 0, failure: 0, criticalFailure: 0, criticalSuccess: 0 };
	const msgs = message.content.split("\n");
	const count: Count = {
		success: 0,
		failure: 0,
		criticalFailure: 0,
		criticalSuccess: 0,
	};
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

function getAuthor(message: Djs.Message | Djs.PartialMessage): string | undefined {
	if (message.interactionMetadata?.user) return message.interactionMetadata.user.id;
	if (!message.content) return undefined;
	const regAuthor = /\*<?@(.*?)>?\*/;
	const match = regAuthor.exec(message.content);
	return match ? match?.[1] : undefined;
}

function addCount(
	criticalCount: CriticalCount,
	userId: string,
	guildId: string,
	messageCount: Count
) {
	const existingCount = criticalCount.get(guildId, userId);
	if (!existingCount) {
		criticalCount.set(guildId, messageCount, userId);
		return;
	}

	const newCount: Count = {
		success: existingCount.success + messageCount.success,
		failure: existingCount.failure + messageCount.failure,
		criticalFailure: existingCount.criticalFailure + messageCount.criticalFailure,
		criticalSuccess: existingCount.criticalSuccess + messageCount.criticalSuccess,
	};
	criticalCount.set(guildId, newCount, userId);
}

function removeCount(
	criticalCount: CriticalCount,
	userId: string,
	guildId: string,
	messageCount: Count
) {
	const existingCount = criticalCount.get(guildId, userId);
	if (!existingCount) return; //we can't remove what doesn't exist

	const newCount: Count = {
		success: Math.max(0, existingCount.success - messageCount.success),
		failure: Math.max(0, existingCount.failure - messageCount.failure),
		criticalFailure: Math.max(
			0,
			existingCount.criticalFailure - messageCount.criticalFailure
		),
		criticalSuccess: Math.max(
			0,
			existingCount.criticalSuccess - messageCount.criticalSuccess
		),
	};
	criticalCount.set(guildId, newCount, userId);
}

export function saveCount(
	message: Djs.Message | Djs.PartialMessage,
	criticalCount: CriticalCount,
	guildId: string,
	type: "add" | "remove" = "add"
) {
	const count = getTypeFroMessage(message);
	const userId = getAuthor(message);
	if (!userId) return;
	if (type === "add") addCount(criticalCount, userId, guildId, count);
	else removeCount(criticalCount, userId, guildId, count);
}
