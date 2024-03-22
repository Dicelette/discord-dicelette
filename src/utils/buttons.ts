import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { TFunction } from "i18next";

const addTemplateButton = (ul: TFunction<"translation", undefined>) => {
	return new ButtonBuilder()
		.setCustomId("add_template")
		.setLabel(ul("button.add.template"))
		.setEmoji("➕")
		.setStyle(ButtonStyle.Primary);
};

export function editUserButtons(ul: TFunction<"translation", undefined>, stats?: boolean, dice?: boolean, template?: boolean) {
	const addDice = new ButtonBuilder()
		.setCustomId("add_dice")
		.setLabel(ul("button.dice"))
		.setEmoji("➕")	
		.setStyle(ButtonStyle.Primary);
	const editUser = new ButtonBuilder()
		.setCustomId("edit_stats")
		.setLabel(ul("button.edit.stats"))
		.setEmoji("📝")
		.setStyle(ButtonStyle.Secondary);
	const editDice = new ButtonBuilder()
		.setCustomId("edit_dice")
		.setLabel(ul("button.edit.dice"))
		.setEmoji("📝")
		.setStyle(ButtonStyle.Secondary);
	const editTemplate = new ButtonBuilder()
		.setCustomId("edit_template")
		.setLabel(ul("button.edit.template"))
		.setStyle(ButtonStyle.Secondary)
		.setEmoji("📝");
	if (stats && dice && template)	
		return new ActionRowBuilder<ButtonBuilder>().addComponents([editUser, editDice, addDice, editTemplate]);
	const components = [addDice];
	if (stats) components.push(editUser);
	if (dice) components.push(editDice);
	if (template) components.push(editTemplate);
	else components.push(addTemplateButton(ul));
	return new ActionRowBuilder<ButtonBuilder>().addComponents(components);
}



export function continueCancelButtons(ul: TFunction<"translation", undefined>) {
	const continueButton = new ButtonBuilder()
		.setCustomId("continue")
		.setLabel(ul("button.continue"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("button.cancel"))
		.setStyle(ButtonStyle.Danger);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([continueButton, cancelButton]);
}

export function validateCancelButton(ul: TFunction<"translation", undefined>) {
	const validateButton = new ButtonBuilder()
		.setCustomId("validate")
		.setLabel(ul("button.validate"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("button.cancel"))
		.setStyle(ButtonStyle.Danger);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([validateButton, cancelButton]);
}

export function registerDmgButton(ul: TFunction<"translation", undefined>) {
	const validateButton = new ButtonBuilder()
		.setCustomId("validate")
		.setLabel(ul("button.validate"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("button.cancel"))
		.setStyle(ButtonStyle.Danger);
	const registerDmgButton = new ButtonBuilder()
		.setCustomId("add_dice_first")
		.setLabel(ul("button.dice"))
		.setStyle(ButtonStyle.Primary);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([registerDmgButton, validateButton, cancelButton]);
}