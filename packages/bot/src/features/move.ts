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
import type { Feature } from "./base";

const botErrorOptions: BotErrorOptions = {
	cause: "validationMove",
	level: BotErrorLevel.Warning,
};

/**
 * Move feature class - handles moving characters between users
 */
export class MoveFeature implements Feature {
	private interaction: Djs.StringSelectMenuInteraction | Djs.ModalSubmitInteraction;
	private ul: Translation;
	private interactionUser: Djs.User;
	private client?: EClient;

	constructor(
		interaction: Djs.StringSelectMenuInteraction | Djs.ModalSubmitInteraction,
		ul: Translation,
		interactionUser: Djs.User,
		client?: EClient
	) {
		this.interaction = interaction;
		this.ul = ul;
		this.interactionUser = interactionUser;
		this.client = client;
	}

	/**
	 * Handles the start of move operation from a select menu interaction
	 * Note: Unlike Avatar and Rename, Move doesn't require the db parameter
	 * as it only checks moderator permissions via guild member cache
	 */
	async start(): Promise<void> {
		if (!(this.interaction instanceof Djs.StringSelectMenuInteraction)) return;
		const moderator = this.interaction.guild?.members.cache
			.get(this.interactionUser.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		if (moderator) await this.showMove();
		else
			await this.interaction.reply({
				content: this.ul("modals.noPermission"),
				flags: Djs.MessageFlags.Ephemeral,
			});
	}

	/**
	 * Displays a modal for selecting a user to move the character to
	 */
	private async showMove(): Promise<void> {
		if (!(this.interaction instanceof Djs.StringSelectMenuInteraction)) return;
		const modal = new Djs.ModalBuilder()
			.setCustomId("move")
			.setTitle(this.ul("button.user"))
			.addLabelComponents((label) =>
				label
					.setLabel(this.ul("common.user"))
					.setUserSelectMenuComponent((select) =>
						select.setCustomId("user").setRequired(true).setMaxValues(1)
					)
			);
		await this.interaction.showModal(modal);
	}

	/**
	 * Handles a Discord modal submission to validate and process the transfer of a character between users within a guild.
	 *
	 * Validates user input, retrieves and updates character ownership, and invokes the move command to complete the transfer. Provides localized error feedback and resets the interaction state if validation fails at any step.
	 */
	async validate(): Promise<void> {
		if (!this.client) return;
		if (!(this.interaction instanceof Djs.ModalSubmitInteraction)) return;
		if (!this.interaction.message || !this.interaction.channel || !this.interaction.guild) return;
		profiler.startProfiler();
		const message = await (this.interaction.channel as TextChannel).messages.fetch(
			this.interaction.message.id
		);
		await this.interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const user = this.interaction.fields.getSelectedUsers("user")?.first();
		if (!user) return;
		const embed = getEmbeds(message, "user");
		if (!embed) throw new BotError(this.ul("error.embed.notFound"), botErrorOptions);

		const oldUserId = embed
			.toJSON()
			.fields?.find((field) => findln(field.name) === "common.user")
			?.value.replace(/<@|>/g, "");
		if (!oldUserId) {
			await this.interaction.reply({
				embeds: [embedError(this.ul("error.user.notFound"), this.ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			await resetButton(message, this.ul);
			return;
		}
		const oldUser = await isUserNameOrId(oldUserId, this.interaction);
		if (!oldUser) {
			await this.interaction.reply({
				embeds: [embedError(this.ul("error.user.notFound"), this.ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			await resetButton(message, this.ul);
			return;
		}

		const sheetLocation: PersonnageIds = {
			channelId: this.interaction.channel.id,
			messageId: message.id,
		};
		const charData = getUserByEmbed({ message: message });
		if (!charData) {
			await this.interaction.reply({
				embeds: [embedError(this.ul("error.user.notFound"), this.ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			await resetButton(message, this.ul);
			return;
		}
		//update the characters in the database characters
		const allCharsNewUser = this.client.characters.get(this.interaction.guild.id, user.id);
		const allCharsOldUser = this.client.characters.get(this.interaction.guild.id, oldUserId);
		if (allCharsOldUser)
			//remove the character from the old user
			this.client.characters.set(
				this.interaction.guild.id,
				allCharsOldUser.filter((char) => char?.userName !== charData?.userName),
				oldUserId
			);
		if (allCharsNewUser) {
			//prevent duplicate
			if (!allCharsNewUser.find((char) => char?.userName === charData?.userName))
				this.client.characters.set(
					this.interaction.guild.id,
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
			messageId: [message.id, this.interaction.channel.id],
		};
		const guildData = this.client.settings.get(this.interaction.guild.id);
		if (!guildData) return;
		await move(
			user,
			this.interaction,
			this.ul,
			oldUser.user,
			this.client,
			sheetLocation,
			oldData,
			this.interaction.channel as DiscordChannel
		);
		profiler.stopProfiler();
	}
}
