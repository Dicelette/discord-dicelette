import type { Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { allowEdit } from "utils";

export async function initiateMove(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser)) await showMove(interaction, ul);
}

async function showMove(interaction: Djs.StringSelectMenuInteraction, ul: Translation) {
	const modal = new Djs.ModalBuilder()
		.setCustomId("move")
		.setTitle(ul("button.edit.move"));
	const input =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("user")
				.setLabel(ul("common.user"))
				.setRequired(true)
				.setStyle(Djs.TextInputStyle.Short)
		);
	modal.addComponents(input);
	await interaction.showModal(modal);
}
