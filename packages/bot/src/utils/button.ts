import type { DataToFooter, Translation } from "@dicelette/types";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { ensureEmbed, reply } from "messages";
import { findln } from "packages/localization";
import { fetchUser } from "utils";

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
				.setLabel(ul("modals.avatar.name"))
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

/**
 * Handles the cancel button interaction, deleting the message if the user is authorized.
 *
 * Deletes the interaction message if the interacting user is either the user referenced in the embed or has moderator permissions. Otherwise, replies with a localized no-permission message.
 */
export async function cancel(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	client: EClient,
	interactionUser: Djs.User,
	sendRefusal = false,
	cancelByUser = false
) {
	const embed = ensureEmbed(interaction.message);
	const userFieldId = embed.fields
		.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");

	// Détermine si l'interaction vient du propriétaire (via champ ou via footer de secours)
	const isOwnerFromField = userFieldId === interactionUser.id;
	const footerText = embed.footer?.text;
	let isOwner = isOwnerFromField;
	if (!isOwner && footerText) {
		try {
			const data: DataToFooter = JSON.parse(footerText);
			isOwner = data.userID === interactionUser.id;
		} catch {
			isOwner = false;
		}
	}

	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);

	// Cas d'annulation par l'utilisateur lui-même
	if (cancelByUser) {
		if (isOwner) {
			await interaction.message.delete();
			await reply(interaction, {
				content: ul("register.cancelled"),
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		// Toute autre personne (y compris un modérateur) ne peut pas annuler 'au nom de' l'utilisateur
		await reply(interaction, {
			content: ul("modals.noPermission"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	// Cas principal: annulation standard (modérateur ou propriétaire sans envoi de refus)
	const canDelete = isModerator || (isOwner && !sendRefusal);
	if (!canDelete) {
		await reply(interaction, {
			content: ul("modals.noPermission"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	await interaction.message.delete();
	// Envoi du refus en MP si demandé et effectué par un modérateur sur un autre utilisateur
	if (sendRefusal && isModerator && userFieldId && userFieldId !== interactionUser.id) {
		const userFetch = await fetchUser(client, userFieldId);
		await userFetch?.send({
			content: ul("register.refusalSent", {
				guild: interaction.guild?.name,
				mention: `<@${interaction.user.id}>`,
			}),
		});
	}
	await reply(interaction, {
		content: ul("register.cancelled"),
		flags: Djs.MessageFlags.Ephemeral,
	});
}

/**
 * Creates an action row with "continue" and "cancel" buttons for multi-page user registration.
 *
 * @returns An action row containing the "continue" and "cancel" buttons.
 */
export function continueCancelButtons(ul: Translation) {
	const continueButton = new Djs.ButtonBuilder()
		.setCustomId("continue")
		.setLabel(ul("button.continue"))
		.setStyle(Djs.ButtonStyle.Success);
	const cancelButton = new Djs.ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("common.cancel"))
		.setStyle(Djs.ButtonStyle.Danger);
	return new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents([
		continueButton,
		cancelButton,
	]);
}

/**
 * Reconstructs the appropriate edit buttons and select menu for a user character sheet message.
 *
 * Determines which edit buttons ("edit stats" and "edit dice") are present in the given message and generates a new action row of buttons accordingly, along with the select menu for editing options.
 *
 * @returns An object containing the reconstructed buttons action row and the select menu action row.
 */
export function getButton(message: Djs.Message, ul: Translation) {
	const oldsButtons =
		message.components as Djs.ActionRow<Djs.MessageActionRowComponent>[];

	const haveStats = oldsButtons.some(
		(row: Djs.ActionRow<Djs.MessageActionRowComponent>) =>
			row.components.some((button) => button.customId === "edit_stats")
	);
	const haveDice = oldsButtons.some((row: Djs.ActionRow<Djs.MessageActionRowComponent>) =>
		row.components.some((button) => button.customId === "edit_dice")
	);
	const buttons = editUserButtons(ul, haveStats, haveDice);
	const select = selectEditMenu(ul);
	return { buttons, select };
}
