import type { Characters, Translation, UserData } from "@dicelette/types";
import { uniformizeRecords } from "@dicelette/utils";
import { getUserByEmbed } from "database";
import type * as Djs from "discord.js";

export function getCharaInMemory(
	characters: Characters,
	userID: string,
	guildID: string,
	charName?: string | null
) {
	const getChara = characters.get(guildID, userID);
	return getChara?.find((char) => {
		if (!charName) return char?.userName == null;
		return char?.userName?.subText(charName, true);
	});
}

export async function updateMemory(
	characters: Characters,
	guildId: string,
	userID: string,
	_ul: Translation,
	data: Partial<{ userData: UserData; message: Djs.Message; embeds: Djs.EmbedBuilder[] }>
) {
	let { userData, message, embeds } = data;
	if (!userData) {
		if (embeds) userData = getUserByEmbed({ embeds });
		else if (message) userData = getUserByEmbed({ message });
		else return;
		if (!userData) return;
	}
	if (userData.damage)
		userData.damage = uniformizeRecords(userData.damage) as Record<string, string>;
	if (userData.stats)
		userData.stats = uniformizeRecords(userData.stats) as Record<string, number>;
	const userChar = characters.get(guildId, userID);
	if (userChar) {
		const findChar = userChar.find(
			(char) =>
				char?.userName?.subText(userData.userName, true) ||
				(char.userName == null && userData.userName == null)
		);
		if (findChar) {
			const index = userChar.indexOf(findChar);
			userChar[index] = userData;
		} else userChar.push(userData);
		characters.set(guildId, userChar, userID);
	} else characters.set(guildId, [userData], userID);
	return userData;
}

export function deleteUserInChar(
	characters: Characters,
	userId: string,
	guildId: string,
	charName?: string | null
) {
	const userData = characters.get(guildId, userId);
	if (userData) {
		const filter = userData.filter((char) => !char.userName?.subText(charName, true));
		if (filter.length === 0) characters.delete(guildId, userId);
		else characters.set(guildId, filter, userId);
	}
}
