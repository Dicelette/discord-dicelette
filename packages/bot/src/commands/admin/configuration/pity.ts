import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import { random } from "@dicelette/utils";
import type * as Djs from "discord.js";
import { reply } from "messages";

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
 * Trigger pity based on threshold and userFailNb.
 * Below 75% of threshold, no pity.
 * Between 75% and 100% of threshold, increase chance to trigger pity (starting at 50%, reaching 100%)
 * When threshold >=1, pity is always triggered.
 * @param {number} threshold Threshold to trigger pity in the guild settings
 * @param {number} userFailNb Number of consecutive failures of the user
 * @returns {boolean} True if pity is triggered, False otherwise
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
	const t = (triggerChance - 0.75) / 0.25; // normalise sur [0,1]
	const alpha = 1;
	// Probability calculation
	//starting at 0.5 when t=0, going to 1 when t=1
	const p = 0.5 + 0.5 * t ** alpha;

	// Perform the random trial
	const u = random.real(0, 1, false);
	return u <= p;
}

export function createCacheKey(
	source: Djs.Message | Djs.PartialMessage | Djs.CommandInteraction,
	userId: string
) {
	const timeMin = Math.floor(source.createdTimestamp / 60000);
	const cacheKey = `${source.guildId}:${userId}:${source.channelId}:${timeMin}`;
	const prevCacheKey = `${source.guildId}:${userId}:${timeMin - 1}`;
	return { cacheKey, prevCacheKey, timeMin };
}
