import type { EClient } from "@dicelette/client";
import { findln } from "@dicelette/localization";
import type {
	DiscordChannel,
	PersonnageIds,
	Translation,
	UserMessageId,
} from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	profiler,
} from "@dicelette/utils";
import { move, resetButton } from "commands";
import { getUserByEmbed } from "database";
import type { TextChannel } from "discord.js";
import * as Djs from "discord.js";
import { embedError, getEmbeds } from "messages";
import { isUserNameOrId } from "utils";
import { Feature } from "./base";

const botErrorOptions: BotErrorOptions = {
	cause: "validationMove",
	level: BotErrorLevel.Warning,
};

/**
 * Move feature class - handles moving characters between users
 */
export class MoveFeature extends Feature {
	/**
	 * Handles the start of move operation from a select menu interaction
	 */
	async start(
		interaction: Djs.StringSelectMenuInteraction,
		ul: Translation,
		interactionUser: Djs.User
	): Promise<void> {
		const moderator = interaction.guild?.members.cache
			.get(interactionUser.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		if (moderator) await this.showMove(interaction, ul);
		else
			await interaction.reply({
				content: ul("modals.noPermission"),
				flags: Djs.MessageFlags.Ephemeral,
			});
	}

	/**
	 * Displays a modal for selecting a user to move the character to
	 */
	private async showMove(
		interaction: Djs.StringSelectMenuInteraction,
		ul: Translation
	): Promise<void> {
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

	/**
	 * Handles a Discord modal submission to validate and process the transfer of a character between users within a guild.
	 *
	 * Validates user input, retrieves and updates character ownership, and invokes the move command to complete the transfer. Provides localized error feedback and resets the interaction state if validation fails at any step.
	 */
	async validate(
		interaction: Djs.ModalSubmitInteraction,
		ul: Translation,
		client: EClient
	): Promise<void> {
		if (!interaction.message || !interaction.channel || !interaction.guild) return;
		profiler.startProfiler();
		const message = await (interaction.channel as TextChannel).messages.fetch(
			interaction.message.id
		);
		await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const user = interaction.fields.getSelectedUsers("user")?.first();
		if (!user) return;
		const embed = getEmbeds(message, "user");
		if (!embed) throw new BotError(ul("error.embed.notFound"), botErrorOptions);

		const oldUserId = embed
			.toJSON()
			.fields?.find((field) => findln(field.name) === "common.user")
			?.value.replace("<@", "")
			.replace(">", "");
		if (!oldUserId) {
			await interaction.reply({
				embeds: [embedError(ul("error.user.notFound"), ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return await resetButton(message, ul);
		}
		const oldUser = await isUserNameOrId(oldUserId, interaction);
		if (!oldUser) {
			await interaction.reply({
				embeds: [embedError(ul("error.user.notFound"), ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return await resetButton(message, ul);
		}

		const sheetLocation: PersonnageIds = {
			channelId: interaction.channel!.id,
			messageId: message.id,
		};
		const charData = getUserByEmbed({ message: message });
		if (!charData) {
			await interaction.reply({
				embeds: [embedError(ul("error.user.notFound"), ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return await resetButton(message, ul);
		}
		//update the characters in the database characters
		const allCharsNewUser = client.characters.get(interaction.guild!.id, user.id);
		const allCharsOldUser = client.characters.get(interaction.guild!.id, oldUserId);
		if (allCharsOldUser)
			//remove the character from the old user
			client.characters.set(
				interaction.guild!.id,
				allCharsOldUser.filter((char) => char?.userName !== charData?.userName),
				oldUserId
			);
		if (allCharsNewUser) {
			//prevent duplicate
			if (!allCharsNewUser.find((char) => char?.userName === charData?.userName))
				client.characters.set(
					interaction.guild!.id,
					[...allCharsNewUser, charData],
					user.id
				);
		}

		const oldData: {
			charName?: string | null;
			messageId: UserMessageId;
			damageName?: string[];
			isPrivate?: boolean;
		} = {
			charName: charData.userName,
			damageName: Object.keys(charData.damage ?? {}),
			isPrivate: charData.private,
			messageId: [message.id, interaction.channel.id],
		};
		const guildData = client.settings.get(interaction.guild.id);
		if (!guildData) return;
		await move(
			user,
			interaction,
			ul,
			oldUser.user,
			client,
			sheetLocation,
			oldData,
			interaction.channel as DiscordChannel
		);
		profiler.stopProfiler();
	}
}

// Export singleton instance
export const Move = new MoveFeature();
