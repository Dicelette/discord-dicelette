import type {
	CharDataWithName,
	CharacterData,
	Characters,
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
import { editUserButtons, haveAccess, searchUserChannel, selectEditMenu } from "utils";

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
			name: "📝 • [STATS]",
			autoArchiveDuration: 10080,
		})) as Djs.AnyThreadChannel;
		if (save) setDefaultManagerId(guildData, interaction, thread.id);
	}
	return thread;
}

/**
 * Set the tags for thread channel in forum
 */
export async function setTagsForRoll(forum: Djs.ForumChannel) {
	//check if the tags `🪡 roll logs` exists
	const allTags = forum.availableTags;
	const diceRollTag = allTags.find(
		(tag) => tag.name === "Dice Roll" && tag.emoji?.name === "🪡"
	);
	if (diceRollTag) return diceRollTag;

	const availableTags: Djs.GuildForumTagData[] = allTags.map((tag) => {
		return {
			id: tag.id,
			moderated: tag.moderated,
			name: tag.name,
			emoji: tag.emoji,
		};
	});
	availableTags.push({
		name: "Dice Roll",
		emoji: { id: null, name: "🪡" },
	});
	await forum.setAvailableTags(availableTags);

	return forum.availableTags.find(
		(tag) => tag.name === "Dice Roll" && tag.emoji?.name === "🪡"
	) as Djs.GuildForumTagData;
}

/**
 * Repost the character sheet in the thread / channel selected with `guildData.managerId`
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
	characters: Characters
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
		embeds: embed,
		components: [editUserButtons(ul, which.stats, which.dice), selectEditMenu(ul)],
	};
	let isForumThread = false;
	let thread = await searchUserChannel(guildData, interaction, ul, threadId, true);
	let msg: Djs.Message | undefined = undefined;
	if (!thread) {
		const channel = await interaction.guild?.channels.fetch(threadId);
		// noinspection SuspiciousTypeOfGuard
		if (channel && channel instanceof Djs.ForumChannel) {
			const userName =
				userTemplate.userName ??
				(await interaction.guild?.members.fetch(userId))?.displayName;
			//create a new thread in the forum
			const newThread = await channel.threads.create({
				name: userName ?? `${ul("common.sheet")} ${ul("common.character").toUpperCase()}`,
				autoArchiveDuration: Djs.ThreadAutoArchiveDuration.OneWeek,
				message: dataToSend,
			});
			thread = newThread as Djs.AnyThreadChannel;
			isForumThread = true;
			const starterMsg = await newThread.fetchStarterMessage();
			if (!starterMsg) throw new Error(ul("error.noThread"));
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
		throw new Error(ul("error.noThread"));
	}
	if (!isForumThread) msg = await thread.send(dataToSend);
	if (!msg) throw new Error(ul("error.noThread"));
	const userRegister: UserRegistration = {
		userID: userId,
		isPrivate: userTemplate.private,
		charName: userTemplate.userName,
		damage: damageName,
		msgId: [msg.id, thread.id],
	};
	const userData = await updateMemory(characters, interaction.guild!.id, userId, ul, {
		userData: userTemplate,
	});
	logger.trace("User data updated", userData);
	await registerUser(userRegister, interaction, guildData);
}

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
		| Djs.PublicThreadChannel<boolean>;
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
		await reply(interaction, { embeds: [embedError(ul("error.noThread"), ul)] });
		return { sheetLocation };
	}
	const allowHidden = haveAccess(interaction, thread.id, user?.id ?? interaction.user.id);
	if (!allowHidden && charData[user?.id ?? interaction.user.id]?.isPrivate) {
		await reply(interaction, { embeds: [embedError(ul("error.private"), ul)] });
		return { sheetLocation };
	}
	return { thread, sheetLocation };
}

/**
 * Find a thread by their data or create it for roll
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
			const rollChannel = await channel.guild.channels.fetch(rollChannelId);
			// noinspection SuspiciousTypeOfGuard
			if (
				rollChannel instanceof Djs.ThreadChannel ||
				rollChannel instanceof Djs.TextChannel
			) {
				return rollChannel;
			}
		} catch (e) {
			let command = `${ul("config.name")} ${ul("changeThread.name")}`;

			if (hidden) {
				db.delete(guild, "hiddenRoll");
				command = `${ul("config.name")} ${ul("hidden.title")}`;
			} else db.delete(guild, "rollChannel");
			await sendLogs(ul("error.rollChannelNotFound", { command }), channel.guild, db);
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
		(thread) => thread.name.startsWith("🎲") && !thread.archived
	);
	if (thread) {
		const threadThatMustBeArchived = mostRecentThread.filter(
			(tr) => tr.name.startsWith("🎲") && !tr.archived && tr.id !== thread.id
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
 * Find a forum channel already existing or creat it
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
			const rollChannel = await forum.guild.channels.fetch(rollChannelId);
			if (
				rollChannel instanceof Djs.ThreadChannel ||
				rollChannel instanceof Djs.TextChannel
			) {
				return rollChannel;
			}
		} catch (e) {
			let command = `${ul("config.name")} ${ul("changeThread.name")}`;

			if (hidden) {
				db.delete(guild, "hiddenRoll");
				command = `${ul("config.name")} ${ul("hidden.title")}`;
			} else db.delete(guild, "rollChannel");
			await sendLogs(ul("error.rollChannelNotFound", { command }), forum.guild, db);
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
	const tags = await setTagsForRoll(forum);
	if (rollTopic) {
		//archive all other roll topic
		if (rollTopic.archived) await rollTopic.setArchived(false);
		await rollTopic.setAppliedTags([tags.id as string]);
		return rollTopic;
	}
	//create new forum thread
	return await forum.threads.create({
		name: `🎲 ${topic}`,
		message: { content: ul("roll.reason") },
		appliedTags: [tags.id as string],
	});
}

export async function threadToSend(
	db: Settings,
	channel:
		| Djs.TextChannel
		| Djs.PrivateThreadChannel
		| Djs.NewsChannel
		| Djs.StageChannel
		| Djs.PublicThreadChannel<boolean>
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
