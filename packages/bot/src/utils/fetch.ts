import { ln } from "@dicelette/localization";
import { logger } from "@dicelette/utils";
import type * as Djs from "discord.js";
import type { Guild, GuildMember, User } from "discord.js";
import type { EClient } from "../client";

export function getLangAndConfig(
	client: EClient,
	interaction: Djs.BaseInteraction,
	guildId?: string
) {
	const langToUse = getLangFromInteraction(interaction, client, guildId);
	const ul = ln(langToUse);
	if (interaction.guild) {
		const config = client.settings.get(guildId ?? interaction.guild.id);
		return { langToUse, ul, config };
	}
	return { langToUse, ul };
}

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
		interaction.guild?.preferredLocale ??
		interaction.locale;
	client.guildLocale.set(guildId, locale);
	return locale;
}

export async function fetchChannel(
	guild: Djs.Guild,
	channelId: Djs.Snowflake,
	channel?: Djs.TextBasedChannel
): Promise<Djs.TextBasedChannel | null> {
	try {
		if (channel) return channel;
		const cached = guild.channels.cache.get(channelId);
		if (cached?.isTextBased()) return cached;
		const fetched = await guild.channels.fetch(channelId);
		if (fetched?.isTextBased()) return fetched as unknown as Djs.TextBasedChannel;
		// Fallback for threads or non-guild cached channels
		const any = await guild.client.channels.fetch(channelId);
		if (any?.isTextBased()) return any as Djs.TextBasedChannel;
		return null;
	} catch (error) {
		logger.warn(
			`Failed to fetch channel with ID ${channelId}:`,
			(error as Error).message
		);
		return null;
	}
}

export async function fetchUser(client: EClient, userId: string) {
	try {
		return client.users.cache.get(userId) ?? (await client.users.fetch(userId));
	} catch (error) {
		logger.warn(`Failed to fetch user with ID ${userId}:`, error);
		return undefined;
	}
}
export async function fetchMember(
	guild: Djs.Guild,
	memberId: string
): Promise<Djs.GuildMember | undefined> {
	// Try to get the member from the cache first
	try {
		return guild.members.cache.get(memberId) ?? (await guild.members.fetch(memberId));
	} catch (error) {
		logger.warn(`Failed to fetch member with ID ${memberId}:`, error);
		return undefined;
	}
}

export async function fetchAvatarUrl(guild: Guild, user: User, member?: GuildMember) {
	if (member) return member.avatarURL() ?? user.displayAvatarURL();
	const userId = user.id;
	member = await fetchMember(guild, userId);
	return member?.avatarURL() ?? user.displayAvatarURL();
}
