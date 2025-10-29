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
import type { TextChannel } from "discord.js";
import * as Djs from "discord.js";
import { embedError, getEmbeds } from "messages";
import { isUserNameOrId } from "utils";

/**
 * Handles a Discord modal submission to validate and process the transfer of a character between users within a guild.
 *
 * Validates user input, retrieves and updates character ownership, and invokes the move command to complete the transfer. Provides localized error feedback and resets the interaction state if validation fails at any step.
 */
export async function validate(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	client: EClient
) {
	if (!interaction.message || !interaction.channel || !interaction.guild) return;
	const message = await (interaction.channel as TextChannel).messages.fetch(
		interaction.message.id
	);
	await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
	const user = interaction.fields.getSelectedUsers("user")?.first();
	if (!user) return;
	const embed = getEmbeds(message, "user");
	if (!embed) throw new Error(ul("error.embed.notFound"));
	//const user = await isUserNameOrId(userId, interaction);

	if (!user) {
		await interaction.reply({
			embeds: [embedError(ul("error.user.notFound"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return await resetButton(message, ul);
	}
	const oldUserId = embed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	if (!oldUserId) {
		await interaction.reply({
			embeds: [embedError(ul("error.user.notFound"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return await resetButton(message, ul);
	}
	const oldUser = await isUserNameOrId(oldUserId, interaction);
	if (!oldUser) {
		await interaction.reply({
			embeds: [embedError(ul("error.user.notFound"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return await resetButton(message, ul);
	}

	const sheetLocation: PersonnageIds = {
		channelId: interaction.channel!.id,
		messageId: message.id,
	};
	const charData = getUserByEmbed({ message: message });
	if (!charData) {
		await interaction.reply({
			embeds: [embedError(ul("error.user.notFound"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return await resetButton(message, ul);
	}
	//update the characters in the database characters
	const allCharsNewUser = client.characters.get(interaction.guild!.id, user.id);
	const allCharsOldUser = client.characters.get(interaction.guild!.id, oldUserId);
	if (allCharsOldUser)
		//remove the character from the old user
		client.characters.set(
			interaction.guild!.id,
			allCharsOldUser.filter((char) => char?.userName !== charData?.userName),
			oldUserId
		);
	if (allCharsNewUser) {
		//prevent duplicate
		if (!allCharsNewUser.find((char) => char?.userName === charData?.userName))
			client.characters.set(
				interaction.guild!.id,
				[...allCharsNewUser, charData],
				user.id
			);
	}

	const oldData: {
		charName?: string | null;
		messageId: UserMessageId;
		damageName?: string[];
		isPrivate?: boolean;
	} = {
		charName: charData.userName,
		damageName: Object.keys(charData.damage ?? {}),
		isPrivate: charData.private,
		messageId: [message.id, interaction.channel.id],
	};
	const guildData = client.settings.get(interaction.guild.id);
	if (!guildData) return;
	await move(
		user,
		interaction,
		ul,
		oldUser.user,
		client,
		sheetLocation,
		oldData,
		interaction.channel as DiscordChannel
	);
}
