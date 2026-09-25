import type { EClient } from "@dicelette/client";
import { fetchChannel, fetchMember, haveAccess } from "@dicelette/helpers";
import type {
	CharacterData,
	Characters,
	CharDataWithName,
	PersonnageIds,
	Settings,
	Translation,
	UserData,
	UserRegistration,
} from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	logger,
	mapConcurrent,
} from "@dicelette/utils";
import { registerUser, setDefaultManagerId, updateMemory } from "database";
import * as Djs from "discord.js";
import { deleteAfter, embedError, reply, sendLogs } from "messages";
import { editUserButtons, searchUserChannel, selectEditMenu } from "utils";

const botErrorOptions: BotErrorOptions = {
	cause: "THREAD",
	level: BotErrorLevel.Warning,
};
const THREADS_FETCH_TTL_MS = 15_000;
const threadFetchTimestamps = new Map<string, number>();

function sortThreadsByDate(threads: Iterable<Djs.AnyThreadChannel>) {
	return [...threads].sort(
		(a, b) => (b.createdTimestamp ?? 0) - (a.createdTimestamp ?? 0)
	);
}

async function refreshThreadCacheIfNeeded(
	channel: Djs.TextChannel | Djs.ForumChannel,
	options?: { force?: boolean }
): Promise<boolean> {
	const now = Date.now();
	const lastFetch = threadFetchTimestamps.get(channel.id) ?? 0;
	if (!options?.force && now - lastFetch < THREADS_FETCH_TTL_MS) return true;
	const results = await Promise.allSettled([
		channel.threads.fetchActive(),
		channel.threads.fetchArchived(),
	]);
	const allFetchesSucceeded = results.every((result) => result.status === "fulfilled");
	if (allFetchesSucceeded) threadFetchTimestamps.set(channel.id, now);
	return allFetchesSucceeded;
}

export async function createDefaultThread(
	from: Djs.ThreadChannel | Djs.TextChannel, // If on a thread, walk up to the parent; otherwise create directly in the channel.
	guildData: Settings,
	guild?: Djs.Guild,
	save = true
) {
	if (from instanceof Djs.ThreadChannel) {
		// Not the parent itself — a thread whose parent we still need to resolve.
		const resolved = from.parent ? from : await from.fetch(true);
		// resolved.parentId's typing is an open discord.js issue: https://github.com/discordjs/discord.js/issues/8471
		const parent =
			from.parent ??
			(await from.guild.channels.fetch(resolved.parentId!).catch(() => null));
		if (!parent)
			throw new Error(
				"Parent channel not found for requested thread - Should not happend."
			);
		from = parent as Djs.TextChannel;
	}
	let thread = from.threads.cache.find((thread) => thread.name === "📝 • [STATS]") as
		| Djs.AnyThreadChannel
		| undefined;
	if (!thread) {
		await refreshThreadCacheIfNeeded(from, { force: true });
		thread = from.threads.cache.find(
			(cachedThread) => cachedThread.name === "📝 • [STATS]"
		) as Djs.AnyThreadChannel | undefined;
	}
	if (thread?.archived) await thread.setArchived(false);
	if (!thread) {
		thread = (await from.threads.create({
			autoArchiveDuration: 10080,
			name: "📝 • [STATS]",
		})) as Djs.AnyThreadChannel;
		if (save) setDefaultManagerId(guildData, guild, thread.id);
	}
	return thread;
}

export async function fetchThread(
	parent: Djs.TextChannel | Djs.NewsChannel | Djs.ForumChannel
): Promise<Djs.AnyThreadChannel | undefined> {
	const threads: Djs.Collection<string, Djs.AnyThreadChannel> =
		//@ts-expect-error
		parent.threads.cache.filter(
			(thread: Djs.ThreadChannel) =>
				thread.name.startsWith("📄") && thread.parentId === parent.id
		);
	if (threads.size > 0) {
		return threads.first();
	}

	const fetchedThreads = await parent.threads.fetchActive();
	return fetchedThreads.threads.find(
		(thread) => thread.name.startsWith("📄") && thread.parentId === parent.id
	);
}

/**
 * Set the tags for thread channel in forum
 */
export async function setTags(
	forum: Djs.ForumChannel,
	tagName = "Dice Roll",
	tagEmoji = "🪡"
) {
	const allTags = forum.availableTags;
	const diceRollTag = allTags.find(
		(tag) => tag.name === tagName && tag.emoji?.name === tagEmoji
	);
	if (diceRollTag) return diceRollTag;

	const availableTags: Djs.GuildForumTagData[] = allTags.map((tag) => {
		return {
			emoji: tag.emoji,
			id: tag.id,
			moderated: tag.moderated,
			name: tag.name,
		};
	});
	availableTags.push({
		emoji: { id: null, name: tagEmoji },
		name: tagName,
	});
	await forum.setAvailableTags(availableTags);

	return forum.availableTags.find(
		(tag) => tag.name === tagName && tag.emoji?.name === tagEmoji
	) as Djs.GuildForumTagData;
}

/** Reposts a character sheet embed in a thread/channel (creating a new forum thread if needed), and updates
 * registration/memory with the new message and thread IDs. */
export async function repostInThread(
	embed: Djs.EmbedBuilder[],
	interaction: Djs.BaseInteraction,
	userTemplate: UserData,
	userId: string,
	ul: Translation,
	which: { stats?: boolean; dice?: boolean; template?: boolean },
	guildData: Settings,
	threadId: string,
	characters: Characters,
	files: Djs.AttachmentBuilder[] = [],
	deleteMsg = true
) {
	userTemplate.userName = userTemplate.userName
		? userTemplate.userName.toLowerCase()
		: undefined;
	const damageName = userTemplate.damage ? Object.keys(userTemplate.damage) : undefined;
	const channel = interaction.channel;
	// noinspection SuspiciousTypeOfGuard
	if (
		!channel ||
		channel instanceof Djs.CategoryChannel ||
		channel.isDMBased() ||
		!interaction.guild
	)
		return;
	if (!guildData)
		throw new BotError(
			ul("error.generic.e", {
				e: "No server data found in database for this server.",
			}),
			botErrorOptions
		);
	const dataToSend = {
		components: [editUserButtons(ul, which.stats, which.dice), selectEditMenu(ul)],
		embeds: embed,
		files,
	};
	let isForumThread = false;
	let thread = await searchUserChannel(guildData, interaction, ul, threadId, true);
	let msg: Djs.Message | undefined;
	if (!thread) {
		const channel = await fetchChannel(interaction.guild!, threadId);
		// noinspection SuspiciousTypeOfGuard
		if (channel && channel instanceof Djs.ForumChannel) {
			const userName =
				userTemplate.userName ??
				(await fetchMember(interaction.guild!, userId))?.displayName;
			const newThread = await channel.threads.create({
				autoArchiveDuration: Djs.ThreadAutoArchiveDuration.OneWeek,
				message: dataToSend,
				name: userName ?? `${ul("common.sheet")} ${ul("common.character").toUpperCase()}`,
			});
			thread = newThread as Djs.AnyThreadChannel;
			isForumThread = true;
			const starterMsg = await newThread.fetchStarterMessage();
			if (!starterMsg) throw new BotError(ul("error.channel.thread"), botErrorOptions);
			msg = starterMsg;
			const ping = await thread.send(
				interaction.user.id !== userId
					? `<@${interaction.user.id}> || <@${userId}>`
					: `<@${interaction.user.id}>`
			);
			await deleteAfter(ping, 5000);
		}
	} else {
		// noinspection SuspiciousTypeOfGuard
		if (!thread && channel instanceof Djs.TextChannel)
			thread = await createDefaultThread(channel, guildData, interaction.guild);
	}
	if (!thread) throw new BotError(ul("error.channel.thread"), botErrorOptions);

	if (!isForumThread) msg = await thread.send(dataToSend);
	if (!msg) throw new BotError(ul("error.channel.thread"), botErrorOptions);
	const userRegister: UserRegistration = {
		charName: userTemplate.userName,
		damage: damageName,
		isPrivate: userTemplate.private,
		msgId: [msg.id, thread.id],
		userID: userId,
	};
	const userData = await updateMemory(characters, interaction.guild!.id, userId, ul, {
		userData: userTemplate,
	});
	logger.trace("User data updated", userData);
	await registerUser(userRegister, interaction, guildData, deleteMsg);
}

/** Gets the thread and message location of a user's character sheet, checking access permissions; replies with
 * an error embed and returns just the location if the thread is missing or access is denied. */
export async function findLocation(
	userData: CharacterData,
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	charData: CharDataWithName,
	user?: Djs.User | null
): Promise<{
	thread?:
		| Djs.PrivateThreadChannel
		| Djs.TextChannel
		| Djs.NewsChannel
		| Djs.PublicThreadChannel;
	sheetLocation: PersonnageIds;
}> {
	const sheetLocation: PersonnageIds = {
		channelId: userData.messageId[1],
		messageId: userData.messageId[0],
	};
	const thread = await searchUserChannel(
		client.settings,
		interaction,
		ul,
		sheetLocation?.channelId
	);
	if (!thread) {
		await reply(interaction, {
			embeds: [embedError(ul("error.channel.thread"), ul)],
		});
		return { sheetLocation };
	}
	const allowHidden = await haveAccess(
		interaction,
		thread.id,
		user?.id ?? interaction.user.id
	);
	if (!allowHidden && charData[user?.id ?? interaction.user.id]?.isPrivate) {
		await reply(interaction, { embeds: [embedError(ul("error.private"), ul)] });
		return { sheetLocation };
	}
	return { sheetLocation, thread };
}

/** Finds or creates the dice-roll thread for a text channel: uses the configured roll channel if valid, else the
 * most recent unarchived "🎲" thread (archiving others), else unarchives or creates one. */
export async function findThread(
	db: Settings,
	channel: Djs.TextChannel,
	ul: Translation,
	hidden?: string
) {
	const guild = channel.guild.id;
	const rollChannelId = !hidden ? db.get(guild, "rollChannel") : hidden;
	if (rollChannelId) {
		try {
			const rollChannel = await fetchChannel(channel.guild, rollChannelId);
			// noinspection SuspiciousTypeOfGuard
			if (
				rollChannel instanceof Djs.ThreadChannel ||
				rollChannel instanceof Djs.TextChannel
			) {
				return rollChannel;
			}
		} catch (e) {
			logger.warn(e as Error);
			let command = `${ul("config.name")} ${ul("changeThread.name")}`;

			if (hidden) {
				db.delete(guild, "hiddenRoll");
				command = `${ul("config.name")} ${ul("hidden.title")}`;
			} else db.delete(guild, "rollChannel");
			await sendLogs(ul("error.roll.channelNotFound", { command }), channel.guild, db);
		}
	}
	const threadName = `🎲 ${channel.name.replaceAll("-", " ")}`;
	const findThreadInCache = () => {
		const sortedThreads = sortThreadsByDate(channel.threads.cache.values());
		const rollThread = sortedThreads.find(
			(thread) => thread.name.decode().startsWith("🎲") && !thread.archived
		);
		const threadsToArchive = sortedThreads.filter(
			(thread) =>
				thread.name.decode().startsWith("🎲") &&
				!thread.archived &&
				thread.id !== rollThread?.id
		);
		const archivedNamedThread = sortedThreads.find(
			(thread) => thread.name === threadName && thread.archived
		);
		return { archivedNamedThread, rollThread, threadsToArchive };
	};

	let { archivedNamedThread, rollThread, threadsToArchive } = findThreadInCache();
	if (!rollThread && !archivedNamedThread) {
		await refreshThreadCacheIfNeeded(channel, { force: true });
		({ archivedNamedThread, rollThread, threadsToArchive } = findThreadInCache());
	}

	const thread = rollThread;
	if (thread) {
		await mapConcurrent(threadsToArchive, 3, async (threadToArchive) =>
			threadToArchive.setArchived(true)
		);
		return thread;
	}
	if (archivedNamedThread) {
		await archivedNamedThread.setArchived(false);
		return archivedNamedThread;
	}
	const newThread = await channel.threads.create({
		name: threadName,
		reason: ul("roll.reason"),
	});
	// Delete the message about thread creation.
	await channel.lastMessage?.delete();
	return newThread;
}

/** Finds or creates the dice-roll forum thread: uses the configured roll channel if valid, else an existing
 * "🎲 <topic>" thread (unarchived + tagged), else creates a new one. */
export async function findForumChannel(
	forum: Djs.ForumChannel,
	thread: Djs.ThreadChannel | Djs.TextChannel,
	db: Settings,
	ul: Translation,
	hidden?: string
) {
	const guild = forum.guild.id;
	const rollChannelId = !hidden ? db.get(guild, "rollChannel") : hidden;
	if (rollChannelId) {
		try {
			const rollChannel = await fetchChannel(forum.guild, rollChannelId);
			if (
				rollChannel?.type === Djs.ChannelType.PrivateThread ||
				rollChannel?.type === Djs.ChannelType.PublicThread ||
				rollChannel?.type === Djs.ChannelType.GuildText
			) {
				return rollChannel;
			}
		} catch (e) {
			logger.warn(e as Error);
			let command = `${ul("config.name")} ${ul("changeThread.name")}`;

			if (hidden) {
				db.delete(guild, "hiddenRoll");
				command = `${ul("config.name")} ${ul("hidden.title")}`;
			} else db.delete(guild, "rollChannel");
			await sendLogs(ul("error.roll.channelNotFound", { command }), forum.guild, db);
		}
	}
	let allForumChannel = sortThreadsByDate(forum.threads.cache.values());
	const topic = thread.name;
	const rollTopicName = `🎲 ${topic}`;
	const getRollTopicFromCache = () =>
		allForumChannel.find((forumThread) => forumThread.name === rollTopicName);
	let rollTopic = getRollTopicFromCache();
	if (!rollTopic) {
		await refreshThreadCacheIfNeeded(forum, { force: true });
		allForumChannel = sortThreadsByDate(forum.threads.cache.values());
		rollTopic = getRollTopicFromCache();
	}
	const tags = await setTags(forum);
	if (rollTopic) {
		if (rollTopic.archived) await rollTopic.setArchived(false);
		await rollTopic.setAppliedTags([tags.id as string]);
		return rollTopic;
	}
	return await forum.threads.create({
		appliedTags: [tags.id as string],
		message: { content: ul("roll.reason") },
		name: `🎲 ${topic}`,
	});
}

export async function threadToSend(
	db: Settings,
	channel:
		| Djs.TextChannel
		| Djs.PrivateThreadChannel
		| Djs.NewsChannel
		| Djs.StageChannel
		| Djs.PublicThreadChannel
		| Djs.VoiceChannel,
	ul: Translation,
	isHidden?: string
) {
	const resolvedChannel =
		channel instanceof Djs.ThreadChannel && !channel.parent
			? await channel.fetch()
			: channel;
	const parentChannel =
		resolvedChannel instanceof Djs.ThreadChannel
			? resolvedChannel.parent
			: resolvedChannel;
	if (!parentChannel) return undefined;
	return parentChannel instanceof Djs.TextChannel
		? await findThread(db, parentChannel, ul, isHidden)
		: await findForumChannel(
				channel.parent as Djs.ForumChannel,
				channel as Djs.ThreadChannel,
				db,
				ul,
				isHidden
			);
}
