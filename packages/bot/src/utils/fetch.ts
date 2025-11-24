import type { Translation } from "@dicelette/types";
import { COMPILED_PATTERNS, logger } from "@dicelette/utils";
import type { Guild, GuildMember, User } from "discord.js";
import * as Djs from "discord.js";
import type { EClient } from "../client";

// Re-export from bot-helpers for backward compatibility
export {
	findCharacterByName,
	getGuildSetting,
	getInteractionContext as getLangAndConfig,
	getLangFromInteraction,
	getUserData,
} from "@dicelette/bot-helpers";

export async function fetchChannel(
	guild: Djs.Guild,
	channelId: Djs.Snowflake,
	channel?: Djs.GuildBasedChannel
): Promise<Djs.GuildBasedChannel | null> {
	try {
		// If a channel instance is provided, trust it (must be guild-based for our usage)
		if (channel) return channel;

		// Try guild cache first (returns GuildBasedChannel when present)
		const cached = guild.channels.cache.get(channelId);
		if (cached) return cached as Djs.GuildBasedChannel;

		// Fetch from the guild API (also returns GuildBasedChannel when present)
		const fetched = await guild.channels.fetch(channelId);
		if (fetched) return fetched as Djs.GuildBasedChannel;

		// Fallback for threads or non-guild cached channels accessible via the global client cache
		const any = await guild.client.channels.fetch(channelId);
		// Only return if it's a guild-based channel (e.g., threads) to avoid DM channels
		if (!any?.isDMBased()) return any as Djs.GuildBasedChannel;
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

export async function reuploadAvatar(
	avatar: { name: string; url: string },
	ul: Translation
) {
	if (!avatar.name.match(COMPILED_PATTERNS.VALID_EXTENSIONS))
		throw new Error(ul("error.avatar.format"));
	//we have only a link so we need to fetch the attachment again
	const fetched = await fetch(avatar.url);
	const newAttachment = new Djs.AttachmentBuilder(
		Buffer.from(await fetched.arrayBuffer()),
		{ name: avatar.name }
	);
	const name = `attachment://${avatar.name}`;
	return { name, newAttachment };
}
