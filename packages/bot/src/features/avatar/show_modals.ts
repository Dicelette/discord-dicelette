import type { Settings, Translation } from "@dicelette/types";
import { cleanAvatarUrl } from "@dicelette/utils";
import * as Djs from "discord.js";
import { getEmbeds } from "messages";
import { allowEdit } from "utils";

export async function start(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser))
		await showAvatarEdit(interaction, ul);
}

/**
 * Displays a modal for editing a user's avatar, pre-filling the input with the current avatar URL.
 *
 * @param interaction - The select menu interaction triggering the avatar edit.
 * @param ul - The translation function or object for localized strings.
 *
 * @throws {Error} If the user embed is not found in the interaction message.
 */
async function showAvatarEdit(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation
) {
	const embed = getEmbeds(ul, interaction.message, "user");
	if (!embed) throw new Error(ul("error.embed.notFound"));
	const jsonEmbed = embed.toJSON().thumbnail?.url;
	const thumbnail = jsonEmbed
		? cleanAvatarUrl(jsonEmbed)
		: interaction.user.displayAvatarURL();
	const modal = new Djs.ModalBuilder()
		.setCustomId("editAvatar")
		.setTitle(ul("button.avatar.description"));
	const input =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("avatar")
				.setLabel(ul("modals.avatar.name"))
				.setRequired(true)
				.setStyle(Djs.TextInputStyle.Short)
				.setValue(thumbnail)
		);
	modal.addComponents(input);
	await interaction.showModal(modal);
}
