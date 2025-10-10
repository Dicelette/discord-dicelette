import { findln } from "@dicelette/localization";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { allowEdit } from "utils";
import { getEmbeds } from "../../messages";

export async function start(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser))
		await showRename(interaction, ul);
}

/**
 * Extracts the current character name from the message embed associated with the interaction.
 * @param interaction - The Discord StringSelectMenuInteraction containing the message and embeds.
 * @returns The character name as a string, or null if not found or not set.
 */
function getCurrentName(interaction: Djs.StringSelectMenuInteraction): string | null {
	if (!interaction.message) return null;
	const embeds = getEmbeds(interaction.message, "user", interaction.message.embeds);
	if (!embeds) return null;
	const parsedFields = parseEmbedFields(embeds.toJSON() as Djs.Embed);
	const charNameFields = [
		{ key: "common.charName", value: parsedFields?.["common.charName"] },
		{ key: "common.character", value: parsedFields?.["common.character"] },
	].find((field) => field.value !== undefined);
	if (charNameFields && charNameFields.value !== "common.noSet") {
		return charNameFields.value;
	}
	return null;
}

export async function showRename(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation
) {
	const name = getCurrentName(interaction);
	const modal = new Djs.ModalBuilder()
		.setCustomId("rename")
		.setTitle(ul("button.edit.name"))
		.addLabelComponents((label) =>
			label.setLabel(ul("common.charName")).setTextInputComponent((input) => {
				input.setCustomId("newName").setStyle(Djs.TextInputStyle.Short).setRequired(true);
				if (name) input.setValue(name);
				return input;
			})
		);

	await interaction.showModal(modal);
}
