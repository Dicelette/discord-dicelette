import type { GuildData, UserMessageId } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type { EClient } from "@dicelette/bot-core";
import type * as Djs from "discord.js";
import { addRestriction } from "event";
import { deleteUserInChar } from "./memory";

export function deleteUser(
	interaction: Djs.CommandInteraction | Djs.ModalSubmitInteraction,
	guildData: GuildData,
	user?: Djs.User | null,
	charName?: string | null
) {
	//delete the character from the database
	const userCharIndex = guildData.user[user?.id ?? interaction.user.id].findIndex(
		(char) => {
			return char.charName?.standardize() === charName?.standardize();
		}
	);
	if (userCharIndex === -1) {
		return guildData;
	}
	guildData.user[user?.id ?? interaction.user.id].splice(userCharIndex, 1);
	return guildData;
}

export function deleteByMessageIds(
	messageId: UserMessageId,
	guild: Djs.Guild,
	client: EClient
) {
	const db = client.settings;
	const characters = client.characters;
	const dbUser = db.get(guild.id, "user");
	if (!dbUser) return;
	for (const user of Object.keys(dbUser)) {
		const userChars = dbUser[user];
		const char = userChars.findIndex((char) => {
			return char.messageId === messageId;
		});
		if (char) {
			userChars.splice(char, 1);
			if (userChars.length === 0) {
				db.delete(guild.id, `user.${user}`);
				if (characters.get(guild.id, user)) characters.delete(guild.id, user);
			} else {
				db.set(guild.id, userChars, `user.${user}`);
				deleteUserInChar(characters, user, guild.id);
			}
			logger.trace(`Deleted ${messageId} for user ${user}`);
		}
	}
}

/**
 * Removes user character data and guild settings associated with a specific channel or thread.
 *
 * Cleans up user character entries linked to the given channel or thread and deletes related guild configuration keys if they reference the channel.
 *
 * @param {EClient} client
 * @param {string} guildID - The ID of the guild where the channel or thread exists.
 * @param {Djs.NonThreadGuildBasedChannel | Djs.AnyThreadChannel} channel - The channel or thread being deleted or cleaned up.
 */
export async function deleteIfChannelOrThread(
	client: EClient,
	guildID: string,
	channel: Djs.NonThreadGuildBasedChannel | Djs.AnyThreadChannel
) {
	const db = client.settings;
	const channelID = channel.id;
	cleanUserDB(client, channel);
	if (db.get(guildID, "templateID.channelId") === channelID) {
		db.delete(guildID, "templateID");
		client.template.delete(guildID);
		await addRestriction(client, guildID);
	}
	if (db.get(guildID, "logs") === channelID) db.delete(guildID, "logs");
	if (db.get(guildID, "managerId") === channelID) db.delete(guildID, "managerId");
	if (db.get(guildID, "privateChannel") === channelID)
		db.delete(guildID, "privateChannel");
	if (db.get(guildID, "rollChannel") === channelID) db.delete(guildID, "rollChannel");
}

function cleanUserDB(
	client: EClient,
	thread: Djs.GuildTextBasedChannel | Djs.ThreadChannel | Djs.NonThreadGuildBasedChannel
) {
	const guildDB = client.settings;
	const characters = client.characters;
	const dbUser = guildDB.get(thread.guild.id, "user");
	if (!dbUser) return;
	if (!thread.isTextBased()) return;
	/** if private channel was deleted, delete only the private charactersheet */

	for (const [user, data] of Object.entries(dbUser)) {
		const filterChar = data.filter((char) => {
			return char.messageId[1] !== thread.id;
		});
		const charDeleted = data.find((char) => {
			return char.messageId[1] === thread.id;
		});
		logger.trace(
			`Deleted ${data.length - filterChar.length} characters for user ${user}`
		);
		if (filterChar.length === 0) {
			guildDB.delete(thread.guild.id, `user.${user}`);
			characters.delete(thread.guild.id, user);
		} else guildDB.set(thread.guild.id, filterChar, `user.${user}`);
		if (charDeleted)
			deleteUserInChar(characters, user, thread.guild.id, charDeleted?.charName);
	}
}
