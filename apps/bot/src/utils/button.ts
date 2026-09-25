import type { EClient } from "@dicelette/client";
import { fetchUser } from "@dicelette/helpers";
import { findln } from "@dicelette/localization";
import type { DataToFooter, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { ensureEmbed, reply } from "messages";

/** Buttons to edit the user embed character sheet; by default only "add dice" is included. */
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
				.setLabel(ul("button.user.name"))
				.setValue("user")
				.setEmoji("👤")
				.setDescription(ul("button.user.description")),
			new Djs.StringSelectMenuOptionBuilder()
				.setLabel(ul("button.travel.name"))
				.setValue("travel")
				.setEmoji("✈️")
				.setDescription(ul("button.travel.description"))
		);
	return new Djs.ActionRowBuilder<Djs.StringSelectMenuBuilder>().addComponents(select);
}

/** Handles the cancel button: deletes the message if the user is the embed's owner or a moderator, else replies with a no-permission message. */
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

	// Determines whether the interaction comes from the owner (via field or via backup footer)
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

	// Cases of cancellation by the user himself
	if (cancelByUser) {
		if (isOwner) {
			await interaction.message.delete();
			await reply(interaction, {
				content: ul("register.cancelled"),
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		// No other person (including a moderator) may cancel "on behalf of" the user.
		await reply(interaction, {
			content: ul("modals.noPermission"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	// Main case: standard cancellation (moderator or owner without sending a rejection)
	const canDelete = isModerator || (isOwner && !sendRefusal);
	if (!canDelete) {
		await reply(interaction, {
			content: ul("modals.noPermission"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	await interaction.message.delete();
	// Send the rejection via PM if requested and carried out by a moderator on another user.
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

/** Action row with "continue"/"cancel" buttons for multi-page registration; `page` is embedded in the continue
 * button's customId (older buttons without it are read back as page 1). */
export function continueCancelButtons(ul: Translation, page = 1) {
	const continueButton = new Djs.ButtonBuilder()
		.setCustomId(`continue${page}`)
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

/** Reconstructs the edit buttons and select menu for a character sheet message, based on which buttons it already has. */
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
