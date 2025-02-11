import { findln } from "@dicelette/localization";
import type {
	DiscordChannel,
	PersonnageIds,
	Translation,
	UserMessageId,
} from "@dicelette/types";
import type { EClient } from "client";
import { move, resetButton } from "commands";
import { getUserByEmbed } from "database";
import * as Djs from "discord.js";
import { embedError, getEmbeds } from "messages";
import { isUserNameOrId } from "utils";

export async function validateMove(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	client: EClient
) {
	if (!interaction.message || !interaction.channel || !interaction.guild) return;
	const userId = interaction.fields.getTextInputValue("user");
	if (!userId) return;
	const embed = getEmbeds(ul, interaction.message, "user");
	if (!embed) throw new Error(ul("error.noEmbed"));
	const user = await isUserNameOrId(userId, interaction);

	if (!user) {
		await interaction.reply({
			embeds: [embedError(ul("error.user"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return await resetButton(interaction.message, ul);
	}
	const oldUserId = embed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	if (!oldUserId) {
		await interaction.reply({
			embeds: [embedError(ul("error.user"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return await resetButton(interaction.message, ul);
	}
	const oldUser = await isUserNameOrId(oldUserId, interaction);
	if (!oldUser) {
		await interaction.reply({
			embeds: [embedError(ul("error.user"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return await resetButton(interaction.message, ul);
	}

	const sheetLocation: PersonnageIds = {
		channelId: interaction.channel!.id,
		messageId: interaction.message.id,
	};
	const charData = getUserByEmbed({ message: interaction.message }, ul);
	if (!charData) {
		await interaction.reply({
			embeds: [embedError(ul("error.user"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return await resetButton(interaction.message, ul);
	}
	//update the characters in the database characters
	const allCharsNewUser = client.characters.get(interaction.guild!.id, userId);
	const allCharsOldUser = client.characters.get(interaction.guild!.id, oldUserId);
	if (allCharsOldUser)
		//remove the character from the old user
		client.characters.set(
			interaction.guild!.id,
			allCharsOldUser.filter((char) => char.userName !== charData.userName),
			oldUserId
		);
	if (allCharsNewUser) {
		//prevent duplicate
		if (!allCharsNewUser.find((char) => char.userName === charData.userName))
			client.characters.set(
				interaction.guild!.id,
				[...allCharsNewUser, charData],
				userId
			);
	}

	const oldData: {
		charName?: string | null;
		messageId: UserMessageId;
		damageName?: string[];
		isPrivate?: boolean;
	} = {
		charName: charData.userName,
		messageId: [interaction.message.id, interaction.channel.id],
		damageName: Object.keys(charData.damage ?? {}),
		isPrivate: charData.private,
	};
	const guildData = client.settings.get(interaction.guild.id);
	if (!guildData) return;
	await move(
		user.user,
		interaction,
		ul,
		oldUser.user,
		client,
		sheetLocation,
		oldData,
		interaction.channel as DiscordChannel
	);
}
