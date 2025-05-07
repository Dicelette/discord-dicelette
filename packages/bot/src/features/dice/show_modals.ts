import { ln } from "@dicelette/localization";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { getEmbeds } from "messages";
import { allowEdit } from "utils";

/**
 * Interaction to add a new skill dice
 */
export async function executeAddDiceButton(
	interaction: Djs.ButtonInteraction,
	interactionUser: Djs.User,
	db: Settings
) {
	const allow = await allowEdit(interaction, db, interactionUser);
	if (allow)
		await showDamageDiceModals(
			interaction,
			interaction.customId.includes("first"),
			db.get(interaction.guild!.id, "lang") ?? interaction.locale
		);
}

/**
 * Modal to add a new skill dice
 * - true: It's the modal when the user is registered
 * - false: It's the modal when the user is already registered and a new dice is added to edit the user
 * @param interaction
 * @param first
 * @param lang
 */
export async function showDamageDiceModals(
	interaction: Djs.ButtonInteraction,
	first?: boolean,
	lang: Djs.Locale = Djs.Locale.EnglishGB
) {
	const ul = ln(lang);
	const id = first ? "damageDice_first" : "damageDice";
	const modal = new Djs.ModalBuilder()
		.setCustomId(id)
		.setTitle(ul("register.embed.damage"));
	const damageDice =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("damageName")
				.setLabel(ul("modals.dice.name"))
				.setPlaceholder(ul("modals.dice.placeholder"))
				.setRequired(true)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	const diceValue =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("damageValue")
				.setLabel(ul("modals.dice.value"))
				.setPlaceholder("1d5")
				.setRequired(true)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	modal.addComponents(damageDice);
	modal.addComponents(diceValue);
	await interaction.showModal(modal);
}

/**
 * Start the showEditDice when the button is interacted
 * It will also verify if the user can edit their dice
 */
export async function initiateDiceEdit(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser))
		await showEditDice(interaction, ul);
}

/**
 * Show the modal to **edit** the registered dice
 * Will parse registered dice and show them in the modal as `- Skill : Dice`
 */
export async function showEditDice(interaction: Djs.ButtonInteraction, ul: Translation) {
	const diceEmbed = getEmbeds(ul, interaction.message, "damage");
	if (!diceEmbed) throw new Error(ul("error.invalidDice.embeds"));
	const diceFields = parseEmbedFields(diceEmbed.toJSON() as Djs.Embed);
	let dices = "";
	for (const [skill, dice] of Object.entries(diceFields)) {
		dices += `- ${skill}${ul("common.space")}: ${dice}\n`;
	}
	const modal = new Djs.ModalBuilder()
		.setCustomId("editDice")
		.setTitle(ul("common.dice").capitalize());
	const input =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("allDice")
				.setLabel(ul("modals.edit.dice"))
				.setRequired(true)
				.setStyle(Djs.TextInputStyle.Paragraph)
				.setValue(dices)
		);
	modal.addComponents(input);
	await interaction.showModal(modal);
}
