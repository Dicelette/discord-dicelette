import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import { random } from "@dicelette/utils";
import type * as Djs from "discord.js";
import { reply } from "messages";

/**
 * Set or clear the guild's pity threshold and reply with a localized confirmation.
 *
 * If a numeric pity value is provided, stores it in the guild settings under the key `"pity"` and replies with a success message including the value.
 * If no pity value is provided (falsy), deletes the guild's pity setting and replies with a deletion message.
 *
 * @param options - Command options resolver used to read the pity integer option
 * @param ul - Translation helper for localized reply messages
 * @returns The reply sent to the interaction
 */
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

/**
 * Determine whether the pity mechanic triggers for a user based on the configured threshold and the user's consecutive failures.
 *
 * Between 75% and 100% of the threshold, the trigger probability increases linearly from 50% to 100%; at or above the threshold pity always triggers, below 75% it never triggers.
 *
 * @param threshold - Guild-configured failure threshold for pity
 * @param userFailNb - Number of consecutive failures for the user
 * @returns `true` if pity triggers, `false` otherwise
 */
export function triggerPity(threshold?: number, userFailNb?: number): boolean {
	if (!threshold || !userFailNb) return false;
	// At 75% of threshold: 50% chance to trigger pity
	// At 100% of threshold: 100% chance to trigger pity
	// Below 75%: no pity
	const triggerChance = Math.min(userFailNb / threshold, 1);
	if (triggerChance < 0.75) return false;
	if (triggerChance >= 1) return true;
	//the roll should be lower and lower when we approach the threshold so we need to set the max to something that decrease with triggerChance
	const normalizedValue = (triggerChance - 0.75) / 0.25; // normalize to [0,1]
	const alpha = 1;
	// Probability calculation
	// starting at 0.5 when t=0, going to 1 when t=1
	const p = 0.5 + 0.5 * normalizedValue ** alpha;

	// Perform the random trial
	const u = random.real(0, 1, false);
	return u <= p;
}

/**
 * Build minute-granular cache keys for a user within the context of a guild channel message or interaction.
 *
 * @param source - The message or command interaction used to derive guildId, channelId and timestamp
 * @param userId - The target user's ID included in the key prefix
 * @returns An object containing `cacheKey` for the current minute, `prevCacheKey` for the previous minute, and `timeMin` (minutes since epoch)
 */
export function createCacheKey(
	source: Djs.Message | Djs.PartialMessage | Djs.CommandInteraction,
	userId: string
) {
	const prefix = `${source.guildId}:${userId}:${source.channelId}`
	const timeMin = Math.floor(source.createdTimestamp / 60000);
	const cacheKey = `${prefix}:${timeMin}`;
	const prevCacheKey = `${prefix}:${timeMin - 1}`;
	return { cacheKey, prevCacheKey, timeMin };
}