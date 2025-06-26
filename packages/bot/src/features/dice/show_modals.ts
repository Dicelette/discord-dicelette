import { ln } from "@dicelette/localization";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { getEmbeds } from "messages";
import { allowEdit } from "utils";

/**
 * Handles the interaction for adding a new skill dice via a button press.
 *
 * Checks if the user has permission to edit, then displays a modal for entering new skill dice details.
 */
export async function add(
	interaction: Djs.ButtonInteraction,
	interactionUser: Djs.User,
	db: Settings
) {
	const allow = await allowEdit(interaction, db, interactionUser);
	if (allow)
		await show(
			interaction,
			interaction.customId.includes("first"),
			db.get(interaction.guild!.id, "lang") ?? interaction.locale
		);
}

/**
 * Creates and displays a modal for adding damage dice to a character.
 *
 * @param interaction - The button interaction that triggers the modal.
 * @param first - Indicates if this is the initial dice addition during registration.
 * @param lang - The locale used for modal labels and placeholders.
 */
async function show(
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
 * Initiates the dice editing process when the corresponding button is pressed, verifying the user's permission before displaying the edit modal.
 */
export async function edit(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser)) await showEdit(interaction, ul);
}

/**
 * Displays a modal allowing the user to edit all registered skill dice.
 *
 * Parses the current dice from the message embed and pre-fills the modal input with a formatted list of skill-dice pairs.
 *
 * @throws {Error} If no valid dice embed is found in the message.
 */
async function showEdit(interaction: Djs.ButtonInteraction, ul: Translation) {
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
