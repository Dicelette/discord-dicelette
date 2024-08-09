import {
	ActionRowBuilder,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	type ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
	type StringSelectMenuInteraction,
	type User,
} from "discord.js";
import type {
	DiscordChannel,
	PersonnageIds,
	Settings,
	Translation,
	UserMessageId,
} from "@interface";
import { allowEdit } from "@interactions";
import { getEmbeds } from "@utils/parse";
import { getUserByEmbed } from "@utils/db";
import type { EClient } from "@main";
import { move, resetButton } from "@commands/gimmick/edit";
import { findln } from "@localization";
import { embedError } from "@utils";
import { isUserNameOrId } from "@utils/find";

export async function initiateMove(
	interaction: StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser)) await showMove(interaction, ul);
}

async function showMove(interaction: StringSelectMenuInteraction, ul: Translation) {
	const modal = new ModalBuilder().setCustomId("move").setTitle(ul("button.edit.move"));
	const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("user")
			.setLabel(ul("common.user"))
			.setRequired(true)
			.setStyle(TextInputStyle.Short)
	);
	modal.addComponents(input);
	await interaction.showModal(modal);
}

export async function validateMove(
	interaction: ModalSubmitInteraction,
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
