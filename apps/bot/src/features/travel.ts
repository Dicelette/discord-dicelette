import { findln } from "@dicelette/localization";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	getIdFromMention,
	logger,
	profiler,
} from "@dicelette/utils";
import { getUserByEmbed } from "database";
import * as Djs from "discord.js";
import { embedError, getEmbeds, reply, repostInThread } from "messages";
import { BaseFeature } from "./base";

const botErrorOptions: BotErrorOptions = {
	cause: "validationTravel",
	level: BotErrorLevel.Warning,
};

/**
 * TravelFeature class - handles moving a character sheet to another channel
 * Only moderators (ManageRoles permission) can use this feature
 */
export class TravelFeature extends BaseFeature {
	/**
	 * Handles the start of the travel operation from a select menu interaction.
	 * Checks moderator permissions before showing the channel selection modal.
	 */
	async start(): Promise<void> {
		const interaction = this.interaction as Djs.StringSelectMenuInteraction;
		const moderator = interaction.guild?.members.cache
			.get(this.interactionUser.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		if (moderator) await this.showTravel(interaction);
		else
			await reply(interaction, {
				content: this.ul("modals.noPermission"),
				flags: Djs.MessageFlags.Ephemeral,
			});
	}

	/**
	 * Displays a modal with a channel selector for the destination channel.
	 */
	private async showTravel(interaction: Djs.StringSelectMenuInteraction): Promise<void> {
		const modal = new Djs.ModalBuilder()
			.setCustomId("travel")
			.setTitle(this.ul("button.travel.name"))
			.addLabelComponents((label) =>
				label
					.setLabel(this.ul("modals.channel.name"))
					.setDescription(this.ul("modals.channel.description"))
					.setChannelSelectMenuComponent((select) =>
						select
							.setCustomId("channel")
							.setRequired(true)
							.setMaxValues(1)
							.setChannelTypes(
								Djs.ChannelType.PublicThread,
								Djs.ChannelType.GuildText,
								Djs.ChannelType.PrivateThread,
								Djs.ChannelType.GuildForum
							)
					)
			);
		await interaction.showModal(modal);
	}

	/**
	 * Validates the modal submission and moves the character sheet to the selected channel.
	 *
	 * Reconstructs the embeds and buttons from the original message, sends them to the
	 * target channel, updates the database with the new location, and deletes the old message.
	 */
	async validate(): Promise<undefined | Djs.Message | Djs.InteractionResponse> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!interaction.message || !interaction.channel || !interaction.guild) return;
		if (!this.client) return;
		profiler.startProfiler();
		const message = interaction.message;
		await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });

		const targetChannel = interaction.fields
			.getSelectedChannels("channel", false, [
				Djs.ChannelType.PublicThread,
				Djs.ChannelType.GuildText,
				Djs.ChannelType.PrivateThread,
				Djs.ChannelType.GuildForum,
			])
			?.first();
		if (!targetChannel) return;

		const embed = getEmbeds(message, "user");
		if (!embed) throw new BotError(this.ul("error.embed.notFound"), botErrorOptions);

		const userId = getIdFromMention(
			embed.data.fields?.find((field) => findln(field.name) === "common.user")?.value
		);
		if (!userId) {
			await reply(interaction, {
				embeds: [
					embedError(this.ul("error.user.notFound.userId", { oldUserId: "" }), this.ul),
				],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}

		const charData = getUserByEmbed({ message });
		if (!charData) {
			await reply(interaction, {
				embeds: [
					embedError(
						this.ul("error.user.notFound.charData", { url: message.url }),
						this.ul
					),
				],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}

		// Preserve the private flag from the character cache
		const allChars = this.client.characters.get(interaction.guild.id, userId);
		const cachedChar = allChars?.find(
			(c) => c.userName?.subText(charData.userName, true) ?? !charData.userName
		);
		if (cachedChar) charData.private = cachedChar.private;

		if (!this.client.settings.get(interaction.guild.id)) return;

		// Determine which edit buttons existed on the old message
		const oldsButtons =
			message.components as Djs.ActionRow<Djs.MessageActionRowComponent>[];
		const haveStats = oldsButtons.some((row) =>
			row.components.some((button) => button.customId === "edit_stats")
		);
		const haveDice = oldsButtons.some((row) =>
			row.components.some((button) => button.customId === "edit_dice")
		);

		// Reconstruct embeds from the original message
		const embeds = message.embeds.map((e) => new Djs.EmbedBuilder(e.data));

		// Repost in the target channel — this handles DB registration and memory update
		await repostInThread(
			embeds,
			interaction,
			charData,
			userId,
			this.ul,
			{ stats: haveStats, dice: haveDice },
			this.client.settings,
			targetChannel.id,
			this.client.characters,
			[],
			false
		);

		// repostInThread cannot delete across channels — handle it manually
		try {
			await message.delete();
		} catch (error) {
			logger.warn("TravelFeature: failed to delete old message", error);
		}

		await reply(interaction, {
			content: this.ul("travel.success", { channel: `<#${targetChannel.id}>` }),
			flags: Djs.MessageFlags.Ephemeral,
		});
		profiler.stopProfiler();
	}
}
