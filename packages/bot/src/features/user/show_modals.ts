import type { StatisticalTemplate } from "@dicelette/core";
import type { Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { reply } from "messages";

export async function start(
	interaction: Djs.ButtonInteraction,
	template: StatisticalTemplate,
	interactionUser: Djs.User,
	ul: Translation,
	havePrivate?: boolean,
	selfRegister?: boolean | string
) {
	const moderatorPermission = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	const isModerator = selfRegister || moderatorPermission;

	if (isModerator)
		await show(interaction, template, ul, havePrivate, selfRegister, moderatorPermission);
	else
		await reply(interaction, {
			content: ul("modals.noPermission"),
			flags: Djs.MessageFlags.Ephemeral,
		});
}

/**
 * Modal opened to register a new user with the name of the character and the user id
 */
async function show(
	interaction: Djs.ButtonInteraction,
	template: StatisticalTemplate,
	ul: Translation,
	havePrivate?: boolean,
	selfRegister?: boolean | string,
	isModerator?: boolean
) {
	let nbOfPages = 1;
	if (template.statistics) {
		const nbOfStatistique = Object.keys(template.statistics).length;
		nbOfPages = Math.ceil(nbOfStatistique / 5) > 0 ? Math.ceil(nbOfStatistique / 5) : 2;
	}

	const modal = new Djs.ModalBuilder()
		.setCustomId("firstPage")
		.setTitle(ul("modals.firstPage", { page: nbOfPages + 1 }));
	const charNameInput =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("charName")
				.setLabel(ul("common.charName"))
				.setPlaceholder(ul("modals.charName.description"))
				.setRequired(template.charName || false)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);

	const userIdInputs =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("userID")
				.setLabel(ul("edit.user.title"))
				.setPlaceholder(ul("modals.user.description"))
				.setRequired(true)
				.setValue(interaction.user.username ?? interaction.user.id)
				.setStyle(Djs.TextInputStyle.Short)
		);

	const avatarInputs =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("avatar")
				.setLabel(ul("modals.avatar.name"))
				.setPlaceholder(ul("modals.avatar.description"))
				.setRequired(false)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	const channelIdInput =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("channelId")
				.setLabel(ul("modals.channel.name"))
				.setPlaceholder(ul("modals.channel.description"))
				.setRequired(false)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	const components = [charNameInput, avatarInputs];
	if (!selfRegister || isModerator) components.push(userIdInputs);
	if (!selfRegister?.toString().endsWith("_channel") || isModerator)
		components.push(channelIdInput);

	if (havePrivate && isModerator) {
		const privateInput =
			new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
				new Djs.TextInputBuilder()
					.setCustomId("private")
					.setLabel(ul("modals.private.name"))
					.setPlaceholder(ul("modals.private.description"))
					.setRequired(false)
					.setValue("")
					.setStyle(Djs.TextInputStyle.Short)
			);
		components.push(privateInput);
	}
	modal.addComponents(components);
	await interaction.showModal(modal);
}
