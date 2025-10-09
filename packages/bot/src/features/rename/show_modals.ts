import type { Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { allowEdit } from "utils";

export async function start(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser))
		await showRename(interaction, ul);
}

export async function showRename(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation
) {
	const modal = new Djs.ModalBuilder()
		.setCustomId("rename")
		.setTitle(ul("button.edit.name"))
		.addLabelComponents((label) =>
			label
				.setLabel(ul("common.charName"))
				.setTextInputComponent(
					new Djs.TextInputBuilder()
						.setCustomId("newName")
						.setStyle(Djs.TextInputStyle.Short)
						.setRequired(true)
				)
		);

	await interaction.showModal(modal);
}
