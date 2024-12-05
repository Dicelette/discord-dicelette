import type { PersonnageIds, UserMessageId } from "@dicelette:types/database";
import type { DiscordChannel } from "@dicelette:types/discord";
import { findln } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import type { EClient } from "client";
import { move, resetButton } from "commands/tools/edit";
import { getUserByEmbed } from "database/get_user";
import type * as Djs from "discord.js";
import { embedError, getEmbeds } from "messages/embeds";
import { isUserNameOrId } from "utils/check";

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
			ephemeral: true,
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
			ephemeral: true,
		});
		return await resetButton(interaction.message, ul);
	}
	const oldUser = await isUserNameOrId(oldUserId, interaction);
	if (!oldUser) {
		await interaction.reply({
			embeds: [embedError(ul("error.user"), ul)],
			ephemeral: true,
		});
		return await resetButton(interaction.message, ul);
	}

	const sheetLocation: PersonnageIds = {
		channelId: interaction.channel!.id,
		messageId: interaction.message.id,
	};
	const charData = getUserByEmbed(interaction.message, ul);
	if (!charData) {
		await interaction.reply({
			embeds: [embedError(ul("error.notFound"), ul)],
			ephemeral: true,
		});
		return await resetButton(interaction.message, ul);
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
