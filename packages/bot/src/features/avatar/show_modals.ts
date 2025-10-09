import type { Settings, Translation } from "@dicelette/types";
import { cleanAvatarUrl } from "@dicelette/utils";
import * as Djs from "discord.js";
import { getEmbeds } from "messages";
import { allowEdit, fetchAvatarUrl } from "utils";

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
	const embed = getEmbeds(interaction.message, "user");
	if (!embed) throw new Error(ul("error.embed.notFound"));
	const jsonEmbed = embed.toJSON().thumbnail?.url;
	const thumbnail = jsonEmbed
		? cleanAvatarUrl(jsonEmbed)
		: await fetchAvatarUrl(interaction.guild!, interaction.user);
	const modal = new Djs.ModalBuilder()
		.setCustomId("editAvatar")
		.setTitle(ul("button.avatar.description"))
		.addLabelComponents((label) =>
			label
				.setLabel(ul("modals.avatar.name"))
				.setTextInputComponent((input) =>
					input
						.setCustomId("avatar")
						.setValue(thumbnail)
						.setRequired(true)
						.setStyle(Djs.TextInputStyle.Short)
				)
		);

	await interaction.showModal(modal);
}
