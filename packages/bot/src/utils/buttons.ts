import type { Translation } from "@dicelette/types";
import * as Djs from "discord.js";
/**
 * Button to edit the user embed character sheet
 * By default, only add the "add dice" button
 * @param ul {Translation}
 * @param stats {boolean} Only add it if true
 * @param dice {boolean} Only add the edit dice button it if true
 */
export function editUserButtons(ul: Translation, stats?: boolean, dice?: boolean) {
	const addDice = new Djs.ButtonBuilder()
		.setCustomId("add_dice")
		.setLabel(ul("button.dice"))
		.setEmoji("➕")
		.setStyle(Djs.ButtonStyle.Primary);
	const editUser = new Djs.ButtonBuilder()
		.setCustomId("edit_stats")
		.setLabel(ul("button.edit.stats"))
		.setEmoji("📝")
		.setStyle(Djs.ButtonStyle.Secondary);
	const editDice = new Djs.ButtonBuilder()
		.setCustomId("edit_dice")
		.setLabel(ul("button.edit.dice"))
		.setEmoji("📝")
		.setStyle(Djs.ButtonStyle.Secondary);

	if (stats && dice)
		return new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents([
			editUser,
			editDice,
			addDice,
		]);
	const components = [];
	if (stats) components.push(editUser);
	if (dice) components.push(editDice);
	components.push(addDice);
	return new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(components);
}

export function selectEditMenu(ul: Translation) {
	const select = new Djs.StringSelectMenuBuilder()
		.setCustomId("edit_select")
		.setPlaceholder(ul("button.edit.select"))
		.addOptions(
			new Djs.StringSelectMenuOptionBuilder()
				.setLabel(ul("common.character").capitalize())
				.setEmoji("📝")
				.setValue("name")
				.setDescription(ul("button.name")),
			new Djs.StringSelectMenuOptionBuilder()
				.setLabel(ul("button.avatar.title"))
				.setValue("avatar")
				.setEmoji("🖼")
				.setDescription(ul("button.avatar.description")),
			new Djs.StringSelectMenuOptionBuilder()
				.setLabel(ul("common.user"))
				.setValue("user")
				.setEmoji("👤")
				.setDescription(ul("button.user"))
		);
	return new Djs.ActionRowBuilder<Djs.StringSelectMenuBuilder>().addComponents(select);
}
