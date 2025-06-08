import type { EClient } from "../client";
import type * as Djs from "discord.js";
import { ln } from "@dicelette/localization";

export function getLangAndConfig(
	client: EClient,
	interaction: Djs.BaseInteraction,
	guildId?: string,
) {
	const langToUse = getLangFromInteraction(interaction, client, guildId);
	const ul = ln(langToUse);
	const config = client.settings.get(guildId ?? interaction.guild!.id);
	return { langToUse, ul, config };
}

export function getLangFromInteraction(
	interaction: Djs.BaseInteraction,
	client: EClient,
	guildId?: string,
): Djs.Locale {
	if (!guildId) guildId = interaction.guild!.id;
	const guildLocale = client.guildLocale?.get(guildId);
	if (guildLocale) return guildLocale;
	const locale =
		client.settings.get(guildId, "lang") ??
		interaction.guild?.preferredLocale ??
		interaction.locale;
	client.guildLocale.set(guildId, locale);
	return locale;
}

export async function fetchChannel(
	guild: Djs.Guild,
	channelId: Djs.Snowflake,
): Promise<Djs.GuildBasedChannel | null> {
	try {
		return (
			guild.channels.cache.get(channelId) ??
			(await guild.channels.fetch(channelId))
		);
	} catch (error) {
		console.error(`Failed to fetch channel with ID ${channelId}:`, error);
		return null;
	}
}
