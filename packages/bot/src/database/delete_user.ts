import type { Characters, GuildData, Settings } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type * as Djs from "discord.js";

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

export function deleteUserInChar(
	characters: Characters,
	userId: string,
	guildId: string,
	charName?: string | null
) {
	const userData = characters.get(guildId, userId);
	if (userData) {
		const filter = userData.filter((char) => char.userName !== charName);
		if (filter.length === 0) characters.delete(guildId, userId);
		else characters.set(guildId, filter, userId);
	}
}

export function deleteIfChannelOrThread(
	db: Settings,
	guildID: string,
	channel: Djs.NonThreadGuildBasedChannel | Djs.AnyThreadChannel,
	characters: Characters
) {
	const channelID = channel.id;
	cleanUserDB(db, channel, characters);
	if (db.get(guildID, "templateID.channelId") === channelID)
		db.delete(guildID, "templateID");
	if (db.get(guildID, "logs") === channelID) db.delete(guildID, "logs");
	if (db.get(guildID, "managerId") === channelID) db.delete(guildID, "managerId");
	if (db.get(guildID, "privateChannel") === channelID)
		db.delete(guildID, "privateChannel");
	if (db.get(guildID, "rollChannel") === channelID) db.delete(guildID, "rollChannel");
}

function cleanUserDB(
	guildDB: Settings,
	thread: Djs.GuildTextBasedChannel | Djs.ThreadChannel | Djs.NonThreadGuildBasedChannel,
	characters: Characters
) {
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
		logger.silly(
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
