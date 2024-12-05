import * as Djs from "discord.js";
import type { Settings, Translation } from "@dicelette/types";
import { allowEdit } from "utils/check";

export async function initiateRenaming(
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
		.setTitle(ul("button.edit.name"));
	const input =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("newName")
				.setLabel(ul("common.character"))
				.setRequired(true)
				.setStyle(Djs.TextInputStyle.Short)
		);
	modal.addComponents(input);
	await interaction.showModal(modal);
}
