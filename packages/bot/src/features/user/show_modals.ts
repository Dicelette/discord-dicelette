import type { StatisticalTemplate } from "@dicelette/core";
import type { Translation } from "@dicelette/types";
import type { ButtonInteraction, User } from "discord.js";
import * as Djs from "discord.js";
import { reply } from "messages";

export async function start(
	interaction: ButtonInteraction,
	template: StatisticalTemplate,
	interactionUser: User,
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
	interaction: ButtonInteraction,
	template: StatisticalTemplate,
	ul: Translation,
	havePrivate?: boolean,
	selfRegister?: boolean | string,
	isModerator?: boolean
) {
	let nbOfPages = 1;
	if (template.statistics) {
		const nbOfStatistique = Object.keys(template.statistics).length;
		nbOfPages =
			Math.ceil(nbOfStatistique / 5) > 0 ? Math.ceil(nbOfStatistique / 5) + 1 : 2;
	}

	const modal = new Djs.ModalBuilder()
		.setCustomId("firstPage")
		.setTitle(ul("modals.firstPage", { page: nbOfPages }));

	//create a new Label builder component with a text input for the character name
	const charNameInput: Djs.LabelBuilder = new Djs.LabelBuilder()
		.setLabel(ul("common.charName"))
		.setTextInputComponent(
			new Djs.TextInputBuilder()
				.setCustomId("charName")
				.setPlaceholder(ul("modals.charName.description"))
				.setRequired(template.charName || false)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);

	//we will use the new LabelBuilder component to create a label with a user select for the user!
	const userIdInputs: Djs.LabelBuilder = new Djs.LabelBuilder()
		.setLabel(ul("common.user"))
		.setUserSelectMenuComponent(
			new Djs.UserSelectMenuBuilder()
				.setCustomId("userID")
				.setPlaceholder(ul("modals.user.description"))
				.setRequired(true)
				.setDefaultUsers([interaction.user.id])
				.setMaxValues(1)
		);

	//we will use the new LabelBuilder component to create a label with a text input for the avatar!
	const avatarInputs: Djs.LabelBuilder = new Djs.LabelBuilder()
		.setLabel(ul("modals.avatar.name"))
		.setDescription(ul("modals.avatar.file.description"))
		.setFileUploadComponent(
			new Djs.FileUploadBuilder()
				.setCustomId("avatarFile")
				.setRequired(false)
				.setMaxValues(1)
		);
	//I think an upload is better here. At last we support url in the edit avatar modal
	/*
		.setTextInputComponent(
			new Djs.TextInputBuilder()
				.setCustomId("avatar")
				.setPlaceholder(ul("modals.avatar.description"))
				.setRequired(false)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
		*/

	//const sheetId = client.settings.get(interaction.guild!.id, "managerId");
	//let defaultChannel: Djs.GuildBasedChannel | null = null;
	//if (sheetId) defaultChannel = await fetchChannel(interaction.guild!, sheetId);
	//we will use the new LabelBuilder component to create a label with a channel select for the channel!
	const channelIdInput: Djs.LabelBuilder = new Djs.LabelBuilder()
		.setLabel(ul("modals.channel.name"))
		.setDescription(ul("modals.channel.description"))
		.setChannelSelectMenuComponent(
			new Djs.ChannelSelectMenuBuilder()
				.setCustomId("channelId")
				.setRequired(false)
				.setMaxValues(1)
				.setChannelTypes(
					Djs.ChannelType.PublicThread,
					Djs.ChannelType.GuildText,
					Djs.ChannelType.PrivateThread,
					Djs.ChannelType.GuildForum
				)
		);
	const components = [charNameInput, avatarInputs];
	if (!selfRegister || isModerator)
		//set the userIdInput in the first position if selfRegister is false or the user is a moderator
		components.unshift(userIdInputs);
	if (!selfRegister?.toString().endsWith("_channel") || isModerator)
		components.push(channelIdInput);
	if (havePrivate && isModerator) {
		const privateInput: Djs.LabelBuilder = new Djs.LabelBuilder()
			.setLabel(ul("modals.private.name"))
			.setDescription(ul("modals.private.description"))
			.setTextInputComponent(
				new Djs.TextInputBuilder()
					.setCustomId("private")
					.setRequired(false)
					.setValue("")
					.setStyle(Djs.TextInputStyle.Short)
			);
		components.push(privateInput);
	}

	modal.setLabelComponents(components);
	await interaction.showModal(modal);
}
