import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import { random } from "@dicelette/utils";
import type * as Djs from "discord.js";
import { reply } from "messages";

/** Sets or clears the guild's pity threshold and replies with confirmation (clears if `pity` is falsy). */
export async function setPity(
	interaction: Djs.CommandInteraction,
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	ul: Translation
) {
	const pity = options.getInteger(t("config.pity.option.name"));
	if (!pity) {
		client.settings.delete(interaction.guild!.id, "pity");
		return await reply(interaction, {
			content: ul("config.pity.delete"),
		});
	}
	client.settings.set(interaction.guild!.id, pity, "pity");
	return await reply(interaction, {
		content: ul("config.pity.success", { pity }),
	});
}

/** Whether pity triggers for a user: never below 75% of `threshold`, always at/above it, and linearly scaling
 * from 50% to 100% chance in between. */
export function triggerPity(threshold?: number, userFailNb?: number): boolean {
	if (!threshold || !userFailNb) return false;
	const triggerChance = Math.min(userFailNb / threshold, 1);
	if (triggerChance < 0.75) return false;
	if (triggerChance >= 1) return true;
	// Linearly scale the trigger probability from 0.5 to 1 as triggerChance goes from 0.75 to 1.
	const normalizedValue = (triggerChance - 0.75) / 0.25;
	const alpha = 1;
	const p = 0.5 + 0.5 * normalizedValue ** alpha;

	const u = random.real(0, 1, false);
	return u <= p;
}

/** Builds minute-granular cache keys (current + previous minute) for a user within a guild/channel context. */
export function createCacheKey(
	source: Djs.Message | Djs.PartialMessage | Djs.CommandInteraction,
	userId: string
) {
	const prefix = `${source.guildId}:${userId}:${source.channelId}`;
	const timeMin = Math.floor(source.createdTimestamp / 60000);
	const cacheKey = `${prefix}:${timeMin}`;
	const prevCacheKey = `${prefix}:${timeMin - 1}`;
	return { cacheKey, prevCacheKey, timeMin };
}

export function clearCacheKey(
	message: Djs.Message | Djs.PartialMessage,
	userId: string,
	client: EClient
) {
	const { cacheKey, prevCacheKey } = createCacheKey(message, userId); // Clear timeouts to prevent memory leaks
	const timeoutId = client.trivialCacheTimeouts.get(cacheKey);
	if (timeoutId) {
		clearTimeout(timeoutId);
		client.trivialCacheTimeouts.delete(cacheKey);
	}
	const prevTimeoutId = client.trivialCacheTimeouts.get(prevCacheKey);
	if (prevTimeoutId) {
		clearTimeout(prevTimeoutId);
		client.trivialCacheTimeouts.delete(prevCacheKey);
	}
	client.trivialCache.delete(cacheKey);
	client.trivialCache.delete(prevCacheKey);
}
