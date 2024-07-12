import {
	ActionRowBuilder,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	type ButtonInteraction,
	type User,
	type ModalSubmitInteraction,
} from "discord.js";
import { allowEdit } from "@database";
import type { Translation, Settings } from "@interface";
import { getEmbeds, getEmbedsList } from "@utils/parse";
import { reply } from "@utils";
import { verifyAvatarUrl } from "./register/validate";

export async function initiateAvatarEdit(
	interaction: ButtonInteraction,
	ul: Translation,
	interactionUser: User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser))
		await showAvatarEdit(interaction, ul);
}

export async function showAvatarEdit(interaction: ButtonInteraction, ul: Translation) {
	const embed = getEmbeds(ul, interaction.message, "user");
	if (!embed) throw new Error(ul("error.noEmbed"));
	const thumbnail = embed.toJSON().thumbnail?.url ?? interaction.user.displayAvatarURL();
	const modal = new ModalBuilder()
		.setCustomId("editAvatar")
		.setTitle(ul("button.avatar"));
	const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("avatar")
			.setLabel(ul("modals.avatar.name"))
			.setRequired(true)
			.setStyle(TextInputStyle.Short)
			.setValue(thumbnail)
	);
	modal.addComponents(input);
	await interaction.showModal(modal);
}

export async function validateAvatarEdit(
	interaction: ModalSubmitInteraction,
	ul: Translation
) {
	if (!interaction.message) return;
	const avatar = interaction.fields.getTextInputValue("avatar");
	if (avatar.includes("media.discordapp.net"))
		return await reply(interaction, ul("edit_avatar.error.discord"));
	if (!verifyAvatarUrl(avatar))
		return await reply(interaction, ul("edit_avatar.error.url"));

	const embed = getEmbeds(ul, interaction.message, "user");
	if (!embed) throw new Error(ul("error.noEmbed"));
	embed.setThumbnail(avatar);
	const embedsList = getEmbedsList(ul, { which: "user", embed }, interaction.message);
	await interaction.message.edit({ embeds: embedsList.list });
	await reply(interaction, ul("modals.avatar.success"));
}