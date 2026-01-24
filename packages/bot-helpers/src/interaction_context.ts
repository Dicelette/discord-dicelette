import "uniformize";
import type { EClient } from "@dicelette/client";
import { ln } from "@dicelette/localization";
import type { GuildData, UserData } from "@dicelette/types";
import type * as Djs from "discord.js";
import type { InteractionContext } from "./interfaces";

/**
 * Get comprehensive interaction context including locale and guild configuration.
 * Centralizes the repeated pattern of getting language and config from interactions.
 *
 * @param client - Discord client with settings
 * @param interaction - The interaction to get context for
 * @param guildId - Optional guild ID override
 * @returns Interaction context with locale, translation function, and config
 *
 * @example
 * const { ul, config, langToUse } = getInteractionContext(client, interaction);
 * if (!config) return;
 * await reply(interaction, { content: ul("some.key") });
 */
export function getInteractionContext(
	client: EClient,
	interaction: Djs.BaseInteraction,
	guildId?: string
): InteractionContext {
	const langToUse = getLangFromInteraction(interaction, client, guildId);
	const ul = ln(langToUse);
	if (interaction.guild) {
		const config = client.settings.get(guildId ?? interaction.guild.id) || undefined;
		return { config, langToUse, ul };
	}
	return { langToUse, ul };
}

/**
 * Get the locale to use for an interaction.
 * Checks guild locale cache, then guild settings, then interaction locale.
 *
 * @param interaction - The interaction to get locale for
 * @param client - Discord client with settings
 * @param guildId - Optional guild ID override
 * @returns The locale to use
 */
export function getLangFromInteraction(
	interaction: Djs.BaseInteraction,
	client: EClient,
	guildId?: string
): Djs.Locale {
	if (!interaction.guild) return interaction.locale;
	if (!guildId) guildId = interaction.guild.id;
	const guildLocale = client.guildLocale?.get(guildId);
	if (guildLocale) return guildLocale;
	const locale =
		client.settings.get(guildId, "lang") ??
		interaction.locale ??
		interaction.guild?.preferredLocale;
	client.guildLocale.set(guildId, locale);
	return locale;
}

/**
 * Get a specific guild setting value.
 * Convenience wrapper to avoid repeated client.settings.get() calls.
 *
 * @param client - Discord client with settings
 * @param guildId - Guild ID to get setting for
 * @param key - Setting key to retrieve
 * @returns The setting value or undefined
 *
 * @example
 * const allowSelfRegister = getGuildSetting(client, guildId, "allowSelfRegister");
 * const logs = getGuildSetting(client, guildId, "logs");
 */
export function getGuildSetting<K extends keyof GuildData>(
	client: EClient,
	guildId: string,
	key: K
): GuildData[K] | undefined {
	return client.settings.get(guildId, key) || undefined;
}

/**
 * Get all user data for a specific user in a guild.
 * Centralizes the repeated pattern of accessing user data from settings.
 *
 * @param client - Discord client with settings
 * @param guildId - Guild ID
 * @param userId - User ID
 * @returns Array of user data or undefined if not found
 *
 * @example
 * const userData = getUserData(client, interaction.guild!.id, interaction.user.id);
 * if (!userData) return;
 */
export function getUserData(client: EClient, guildId: string, userId: string) {
	return client.settings.get(guildId, `user.${userId}`);
}

/**
 * Find a character by name in user data array.
 * Centralizes the repeated character search pattern.
 *
 * @param userData - Array of user data to search
 * @param charName - Character name to find (case-insensitive with normalization)
 * @param strict - If true, uses exact substring matching
 * @returns The matching user data or undefined
 *
 * @example
 * const char = findCharacterByName(userData, "Aragorn");
 * if (!char) return;
 */
export function findCharacterByName(
	userData: UserData[] | undefined,
	charName: string | null | undefined,
	strict = false
): UserData | undefined {
	if (!userData || !charName) return undefined;
	return userData.find((char) => {
		if (!char.userName) return charName == null;
		return char.userName.subText(charName, strict);
	});
}
