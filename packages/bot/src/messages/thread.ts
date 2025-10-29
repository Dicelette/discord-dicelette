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
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import { registerUser, setDefaultManagerId, updateMemory } from "database";
import * as Djs from "discord.js";
import { deleteAfter, embedError, reply, sendLogs } from "messages";
import {
	editUserButtons,
	fetchChannel,
	fetchMember,
	haveAccess,
	searchUserChannel,
	selectEditMenu,
} from "utils";

export async function createDefaultThread(
	parent: Djs.ThreadChannel | Djs.TextChannel,
	guildData: Settings,
	interaction: Djs.BaseInteraction,
	save = true
) {
	if (parent instanceof Djs.ThreadChannel) parent = parent.parent as Djs.TextChannel;
	let thread = (await parent.threads.fetch()).threads.find(
		(thread) => thread.name === "📝 • [STATS]"
	) as Djs.AnyThreadChannel | undefined;
	if (!thread) {
		thread = (await parent.threads.create({
			autoArchiveDuration: 10080,
			name: "📝 • [STATS]",
		})) as Djs.AnyThreadChannel;
		if (save) setDefaultManagerId(guildData, interaction, thread.id);
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

	//fetch
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
	//check if the tags `🪡 roll logs` exists
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

/**
 * Reposts a character sheet embed in the specified thread or channel, creating a new thread if necessary.
 *
 * If the target thread does not exist and the channel is a forum, creates a new forum thread for the user and sends the embed with interactive components. Updates user registration and memory with the new message and thread IDs.
 *
 * @param embed - The embed(s) representing the character sheet.
 * @param interaction - The Discord interaction triggering the repost.
 * @param userTemplate - The user's character data template.
 * @param userId - The Discord user ID for whom the sheet is being reposted.
 * @param ul - Translation utility for localized strings.
 * @param which - Flags indicating which edit buttons to display.
 * @param guildData - Guild settings and configuration.
 * @param threadId - The ID of the thread or channel to repost in.
 * @param characters - Character data for the guild.
 *
 * @param files
 * @throws {Error} If the target thread or starter message cannot be found or created.
 */
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
	files: Djs.AttachmentBuilder[] = []
) {
	userTemplate.userName = userTemplate.userName
		? userTemplate.userName.toLowerCase()
		: undefined;
	const damageName = userTemplate.damage ? Object.keys(userTemplate.damage) : undefined;
	const channel = interaction.channel;
	// noinspection SuspiciousTypeOfGuard
	if (!channel || channel instanceof Djs.CategoryChannel) return;
	if (!guildData)
		throw new Error(
			ul("error.generic.e", {
				e: "No server data found in database for this server.",
			})
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
			//create a new thread in the forum
			const newThread = await channel.threads.create({
				autoArchiveDuration: Djs.ThreadAutoArchiveDuration.OneWeek,
				message: dataToSend,
				name: userName ?? `${ul("common.sheet")} ${ul("common.character").toUpperCase()}`,
			});
			thread = newThread as Djs.AnyThreadChannel;
			isForumThread = true;
			const starterMsg = await newThread.fetchStarterMessage();
			if (!starterMsg) throw new Error(ul("error.channel.thread"));
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
			thread = await createDefaultThread(channel, guildData, interaction);
	}
	if (!thread) {
		throw new Error(ul("error.channel.thread"));
	}
	if (!isForumThread) msg = await thread.send(dataToSend);
	if (!msg) throw new Error(ul("error.channel.thread"));
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
	await registerUser(userRegister, interaction, guildData);
}

/**
 * Retrieves the thread and message location of a user's character sheet, ensuring access permissions.
 *
 * If the thread channel cannot be found, or if the user does not have permission to view a private sheet, an error embed is sent as a reply and only the sheet location is returned.
 *
 * @param {CharacterData} userData - Character data containing message and channel IDs.
 * @param {Djs.CommandInteraction} interaction - The Discord command interaction context.
 * @param {EClient} client
 * @param {Translation} ul
 * @param {CharDataWithName} charData - Character data keyed by user ID, used to check privacy settings.
 * @param {Djs.User|null} user - Optional user to check access for; defaults to the interaction user.
 * @returns An object containing the thread channel (if accessible) and the sheet location identifiers.
 */
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

/**
 * Finds or creates a thread for dice rolls in a text channel.
 *
 * If a roll channel is configured in the guild settings, attempts to fetch and return it. If not found or invalid, removes the setting and logs an error. Otherwise, searches for the most recent unarchived thread with a dice roll prefix, archiving any others. If no suitable thread exists, unarchives an archived thread with the correct name or creates a new one.
 *
 * @param db - Guild settings database.
 * @param channel - The text channel to search for or create the roll thread in.
 * @param ul - Translation utility for localized strings.
 * @param hidden - Optional ID for a hidden roll channel.
 * @returns The found or newly created thread channel for dice rolls.
 */
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
			logger.warn(e);
			let command = `${ul("config.name")} ${ul("changeThread.name")}`;

			if (hidden) {
				db.delete(guild, "hiddenRoll");
				command = `${ul("config.name")} ${ul("hidden.title")}`;
			} else db.delete(guild, "rollChannel");
			await sendLogs(ul("error.roll.channelNotFound", { command }), channel.guild, db);
		}
	}
	await channel.threads.fetch();
	await channel.threads.fetchArchived();
	const mostRecentThread = channel.threads.cache.sort((a, b) => {
		const aDate = a.createdTimestamp;
		const bDate = b.createdTimestamp;
		if (aDate && bDate) {
			return bDate - aDate;
		}
		return 0;
	});
	const threadName = `🎲 ${channel.name.replaceAll("-", " ")}`;
	const thread = mostRecentThread.find(
		(thread) => thread.name.decode().startsWith("🎲") && !thread.archived
	);
	if (thread) {
		const threadThatMustBeArchived = mostRecentThread.filter(
			(tr) => tr.name.decode().startsWith("🎲") && !tr.archived && tr.id !== thread.id
		);
		for (const thread of threadThatMustBeArchived) {
			await thread[1].setArchived(true);
		}
		return thread;
	}
	if (mostRecentThread.find((thread) => thread.name === threadName && thread.archived)) {
		const thread = mostRecentThread.find(
			(thread) => thread.name === threadName && thread.archived
		);
		if (thread) {
			await thread.setArchived(false);
			return thread;
		}
	}
	//create thread
	const newThread = await channel.threads.create({
		name: threadName,
		reason: ul("roll.reason"),
	});
	//delete the message about thread creation
	await channel.lastMessage?.delete();
	return newThread;
}

/**
 * Finds or creates a forum thread for dice rolls within a specified forum channel.
 *
 * If a roll channel is configured in the guild settings, attempts to fetch and return it. If not found or invalid, removes the setting and logs an error. Otherwise, searches for an existing forum thread named "🎲 <topic>" matching the provided thread's name. If found, ensures it is unarchived and applies the "Dice Roll" tag. If not found, creates a new forum thread with the appropriate name, tag, and a reason message.
 *
 * @param forum - The forum channel to search or create the thread in.
 * @param thread - The reference thread or text channel whose name is used for the roll thread.
 * @param db - The settings database for guild configuration.
 * @param ul - The translation utility for localized messages.
 * @param hidden - Optional ID for a hidden roll channel.
 * @returns The found or newly created forum thread for dice rolls.
 */
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
			logger.warn(e);
			let command = `${ul("config.name")} ${ul("changeThread.name")}`;

			if (hidden) {
				db.delete(guild, "hiddenRoll");
				command = `${ul("config.name")} ${ul("hidden.title")}`;
			} else db.delete(guild, "rollChannel");
			await sendLogs(ul("error.roll.channelNotFound", { command }), forum.guild, db);
		}
	}
	const allForumChannel = forum.threads.cache.sort((a, b) => {
		const aDate = a.createdTimestamp;
		const bDate = b.createdTimestamp;
		if (aDate && bDate) {
			return bDate - aDate;
		}
		return 0;
	});
	const topic = thread.name;
	const rollTopic = allForumChannel.find((thread) => thread.name === `🎲 ${topic}`);
	const tags = await setTags(forum);
	if (rollTopic) {
		//archive all other roll topic
		if (rollTopic.archived) await rollTopic.setArchived(false);
		await rollTopic.setAppliedTags([tags.id as string]);
		return rollTopic;
	}
	//create new forum thread
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
	const parentChannel = channel instanceof Djs.ThreadChannel ? channel.parent : channel;
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
