import type { EClient } from "@dicelette/client";
import type { Translation } from "@dicelette/types";
import { BotError, BotErrorLevel, logger, QUERY_URL_PATTERNS } from "@dicelette/utils";
import type { Collection, Guild, GuildMember, User } from "discord.js";
import * as Djs from "discord.js";

async function fetchWithCache<T>(
	id: string,
	cache: Collection<string, T> | undefined,
	fetcher: (id: string) => Promise<T>,
	errorId: string
): Promise<T | undefined> {
	try {
		if (!id || (typeof id === "string" && id.trim().length === 0)) return undefined;
		return cache?.get(id) ?? (await fetcher(id)) ?? undefined;
	} catch (error) {
		logger.warn(`Failed to fetch ${errorId} with ID ${id}:`, (error as Error).message);
		return undefined;
	}
}

export async function fetchChannel(
	guild: Djs.Guild,
	channelId: Djs.Snowflake,
	channel?: Djs.GuildBasedChannel
): Promise<Djs.GuildBasedChannel | null> {
	if (channel) return channel;

	const cached = await fetchWithCache(
		channelId as string,
		guild.channels.cache,
		(id) => guild.channels.fetch(id) as Promise<Djs.GuildBasedChannel>,
		"channel"
	);
	if (cached) return cached;

	try {
		// Fallback for threads or non-guild cached channels accessible via the global client cache
		const any = await guild.client.channels.fetch(channelId as string);
		if (!any?.isDMBased()) return any as Djs.GuildBasedChannel;
	} catch (error) {
		logger.warn(
			`Fallback fetch failed for channel ${channelId}:`,
			(error as Error).message
		);
	}
	return null;
}

export async function fetchUser(client: EClient, userId: string) {
	return fetchWithCache(
		userId,
		client.users.cache,
		(id) => client.users.fetch(id),
		"user"
	);
}

export async function fetchMember(
	guild: Djs.Guild,
	memberId: string
): Promise<Djs.GuildMember | undefined> {
	return fetchWithCache(
		memberId,
		guild.members.cache,
		(id) => guild.members.fetch(id),
		"member"
	);
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
	if (!avatar.name.match(QUERY_URL_PATTERNS.VALID_EXTENSIONS))
		throw new BotError(ul("error.avatar.format"), {
			cause: "FETCH_AVATAR",
			level: BotErrorLevel.Warning,
		});
	//we have only a link so we need to fetch the attachment again
	const fetched = await fetch(avatar.url);
	const newAttachment = new Djs.AttachmentBuilder(
		Buffer.from(await fetched.arrayBuffer()),
		{ name: avatar.name }
	);
	const name = `attachment://${avatar.name}`;
	return { name, newAttachment };
}

/**
 * Resolve avatar for CSV import: prefer input avatar, fallback to member/user avatar if CDN is stale,
 * optionally reupload Discord CDN URLs to attachments.
 */
export async function resolveCsvImportAvatar(params: {
	avatar?: string | null;
	guild: Guild;
	user: User;
	member?: GuildMember;
	reuploadDiscordCdn?: boolean;
	ul?: Translation;
}): Promise<{
	avatarUrl: string | null;
	files: Djs.AttachmentBuilder[];
}> {
	const { avatar, guild, user, member, reuploadDiscordCdn = false, ul } = params;
	const fallbackAvatarUrl = await fetchAvatarUrl(guild, user, member);

	if (!avatar)
		return {
			avatarUrl: fallbackAvatarUrl,
			files: [],
		};

	if (!avatar.match(QUERY_URL_PATTERNS.DISCORD_CDN))
		return {
			avatarUrl: avatar,
			files: [],
		};

	if (!reuploadDiscordCdn)
		return {
			avatarUrl: fallbackAvatarUrl,
			files: [],
		};

	if (!ul)
		throw new BotError("Missing translator for Discord CDN avatar reupload", {
			cause: "CSV_AVATAR_REUPLOAD",
			level: BotErrorLevel.Warning,
		});

	const res = await reuploadAvatar(
		{
			name: avatar.split("?")[0].split("/").pop() ?? "avatar.png",
			url: avatar,
		},
		ul
	);

	return {
		avatarUrl: res.name,
		files: [res.newAttachment],
	};
}
