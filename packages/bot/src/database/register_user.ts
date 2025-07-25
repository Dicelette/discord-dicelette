import { ln } from "@dicelette/localization";
import type {
	PersonnageIds,
	Settings,
	UserData,
	UserMessageId,
	UserRegistration,
} from "@dicelette/types";
import type { EClient } from "client";
import { getUser } from "database";
import type * as Djs from "discord.js";
import { searchUserChannel } from "utils";

/**
 * Register the managerId in the database
 */
export function setDefaultManagerId(
	guildData: Settings,
	interaction: Djs.BaseInteraction,
	channel?: string
) {
	if (!channel || !interaction.guild) return;
	guildData.set(interaction.guild.id, channel, "managerId");
}

/**
 * Register an user in the database
 * @returns
 */
export async function registerUser(
	userData: UserRegistration,
	interaction: Djs.BaseInteraction,
	enmap: Settings,
	deleteMsg: boolean | undefined = true,
	errorOnDuplicate: boolean | undefined = false
) {
	const { userID, charName, msgId, isPrivate, damage } = userData;
	const ids: PersonnageIds = { channelId: msgId[1], messageId: msgId[0] };
	if (!interaction.guild) return;
	const guildData = enmap.get(interaction.guild.id);
	if (!guildData) return;
	if (!guildData.user) guildData.user = {};

	const user = enmap.get(interaction.guild.id, `user.${userID}`);

	const newChar = {
		charName,
		messageId: msgId,
		damageName: damage,
		isPrivate,
	};
	if (!charName) delete newChar.charName;
	if (!damage) delete newChar.damageName;
	if (user) {
		const charIndex = user.findIndex((char) => {
			return char.charName?.subText(charName, true);
		});
		if (char) {
			if (errorOnDuplicate) throw new Error("DUPLICATE");
			//delete old message
			if (deleteMsg) {
				try {
					const threadOfChar = await searchUserChannel(
						enmap,
						interaction,
						ln(interaction.locale),
						ids.channelId
					);
					if (threadOfChar) {
						const oldMessage = await threadOfChar.messages.fetch(char.messageId[0]);
						if (oldMessage) await oldMessage.delete();
					}
				} catch (error) {
					logger.warn(error);
					//skip unknown message
				}
			}
			//overwrite the message id
			char.messageId = msgId;
			if (damage) char.damageName = damage;
			enmap.set(interaction.guild.id, char, `user.${userID}.${charIndex}`);
		} else enmap.set(interaction.guild.id, [...user, newChar], `user.${userID}`);
		return;
	}
	enmap.set(interaction.guild.id, [newChar], `user.${userID}`);
}

export async function moveUserInDatabase(
	client: EClient,
	guild: Djs.Guild,
	userId: string,
	location: UserMessageId,
	charName?: string | null,
	oldUserId?: string | null
) {
	if (!oldUserId) return;
	const characters = client.characters;
	const guildId = guild.id;
	const allCharsNewUser = characters.get(guildId, userId);
	const allCharsOldUser = characters.get(guildId, oldUserId);
	if (allCharsOldUser)
		//remove the character from the old user
		characters.set(
			guildId,
			allCharsOldUser.filter((char) => !char.userName?.subText(charName, true)),
			oldUserId
		);
	let char: UserData | undefined;
	if (allCharsOldUser)
		char = allCharsOldUser.find((char) => char.userName?.subText(charName, true));
	else char = await getUser(location, guild, client);
	if (allCharsNewUser) {
		//prevent duplicate
		if (!allCharsNewUser.find((char) => char.userName?.subText(charName, true))) {
			characters.set(guildId, [...allCharsNewUser, char], userId);
		}
	} else characters.set(guildId, [char], userId);
}
