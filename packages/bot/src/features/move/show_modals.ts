import type { Translation } from "@dicelette/types";
import * as Djs from "discord.js";

export async function start(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User
) {
	const moderator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (moderator) await showMove(interaction, ul);
	else
		await interaction.reply({
			content: ul("modals.noPermission"),
			flags: Djs.MessageFlags.Ephemeral,
		});
}

async function showMove(interaction: Djs.StringSelectMenuInteraction, ul: Translation) {
	const modal = new Djs.ModalBuilder()
		.setCustomId("move")
		.setTitle(ul("button.user"))
		.addLabelComponents((label) =>
			label
				.setLabel(ul("common.user"))
				.setUserSelectMenuComponent((select) =>
					select.setCustomId("user").setRequired(true).setMaxValues(1)
				)
		);
	await interaction.showModal(modal);
}
