import "uniformize";
import type { EClient } from "@dicelette/client";
import { ln } from "@dicelette/localization";
import type { GuildData, UserData } from "@dicelette/types";
import type * as Djs from "discord.js";
import type { InteractionContext } from "./interfaces";

/** Gets locale, translation function, and guild config for an interaction. */
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

/** Resolves the locale for an interaction: guild locale cache, then guild settings, then interaction locale. */
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

/** Gets a single guild setting value. */
export function getGuildSetting<K extends keyof GuildData>(
	client: EClient,
	guildId: string,
	key: K
): GuildData[K] | undefined {
	return client.settings.get(guildId, key) || undefined;
}

/** Gets all character data for a user in a guild. */
export function getUserData(client: EClient, guildId: string, userId: string) {
	return client.settings.get(guildId, `user.${userId}`);
}

/** Finds a character by name in a user data array (case-insensitive, normalized). */
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
