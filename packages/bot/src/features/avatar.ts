import { fetchAvatarUrl } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { findln } from "@dicelette/localization";
import type { Settings, Translation } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	cleanAvatarUrl,
	profiler,
	QUERY_URL_PATTERNS,
	verifyAvatarUrl,
} from "@dicelette/utils";
import type { TextChannel } from "discord.js";
import * as Djs from "discord.js";
import { embedError, getEmbeds, replaceEmbedInList, reply } from "messages";
import { allowEdit } from "utils";
import { IFeature } from "./base";

/**
 * Avatar feature class - handles avatar editing operations
 */
export class AvatarFeature implements IFeature {
	/**
	 * Handles the start of avatar editing from a select menu interaction
	 */
	async start(
		interaction: Djs.StringSelectMenuInteraction,
		ul: Translation,
		interactionUser: Djs.User,
		db?: Settings
	): Promise<void> {
		if (db && await allowEdit(interaction, db, interactionUser))
			await this.showAvatarEdit(interaction, ul);
	}

	/**
	 * Displays a modal for editing a user's avatar, pre-filling the input with the current avatar URL.
	 *
	 * @param interaction - The select menu interaction triggering the avatar edit.
	 * @param ul - The translation function or object for localized strings.
	 *
	 * @throws {Error} If the user embed is not found in the interaction message.
	 */
	private async showAvatarEdit(
		interaction: Djs.StringSelectMenuInteraction,
		ul: Translation
	): Promise<void> {
		const embed = getEmbeds(interaction.message, "user");
		if (!embed)
			throw new BotError(ul("error.embed.notFound"), {
				cause: "AVATAR_EDIT",
				level: BotErrorLevel.Warning,
			});
		const jsonEmbed = embed.toJSON().thumbnail?.url;
		let thumbnail = jsonEmbed
			? cleanAvatarUrl(jsonEmbed)
			: await fetchAvatarUrl(interaction.guild!, interaction.user);
		if (thumbnail.match(QUERY_URL_PATTERNS.DISCORD_CDN)) thumbnail = "";
		const modal = new Djs.ModalBuilder()
			.setCustomId("editAvatar")
			.setTitle(ul("button.avatar.description"))
			.addLabelComponents((label) =>
				label
					.setLabel(ul("modals.avatar.name"))
					.setDescription(ul("modals.avatar.description"))
					.setTextInputComponent((input) =>
						input
							.setCustomId("avatar")
							.setValue(thumbnail)
							.setRequired(false)
							.setStyle(Djs.TextInputStyle.Short)
					)
			)
			.addLabelComponents((label) =>
				label
					.setLabel(ul("modals.avatar.name"))
					.setDescription(ul("modals.avatar.file.description"))
					.setFileUploadComponent((file) =>
						file.setCustomId("avatarFile").setRequired(false).setMaxValues(1)
					)
			);

		await interaction.showModal(modal);
	}

	/**
	 * Handles a Discord modal submission to update a user's avatar in an embed message.
	 *
	 * Validates the provided avatar URL, updates the embed's thumbnail if valid, edits the original message with the new embed, and sends an ephemeral confirmation reply to the user.
	 *
	 * @param interaction - The modal submission interaction containing the avatar URL input.
	 * @param ul - Localization utility for retrieving translated strings.
	 *
	 * @throws {Error} If the user embed is not found in the message.
	 */
	async edit(interaction: Djs.ModalSubmitInteraction, ul: Translation): Promise<void> {
		if (!interaction.message) return;
		profiler.startProfiler();
		const message = await (interaction.channel as TextChannel).messages.fetch(
			interaction.message.id
		);
		await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const files: Djs.AttachmentBuilder[] = [];
		const uploaded = interaction.fields.getUploadedFiles("avatarFile")?.first();
		let avatar = "";

		if (uploaded) {
			if (!uploaded.contentType?.match(QUERY_URL_PATTERNS.VALID_EXTENSIONS))
				return await reply(interaction, {
					embeds: [embedError(ul("error.avatar.format"), ul)],
				});
			const attachment = new Djs.AttachmentBuilder(uploaded.url, { name: uploaded.name });
			files.push(attachment);
			avatar = `attachment://${attachment.name}`;
		} else {
			const input = cleanAvatarUrl(interaction.fields.getTextInputValue("avatar"));
			if (!input)
				return await reply(interaction, {
					embeds: [embedError(ul("error.avatar.missing"), ul)],
				});
			if (input.match(QUERY_URL_PATTERNS.DISCORD_CDN))
				return await reply(interaction, {
					embeds: [embedError(ul("error.avatar.cdn"), ul)],
				});
			if (!verifyAvatarUrl(input))
				return await reply(interaction, {
					embeds: [embedError(ul("error.avatar.url"), ul)],
				});
			avatar = input;
		}

		const embed = getEmbeds(message, "user");
		if (!embed)
			throw new BotError(ul("error.embed.notFound"), {
				cause: "AVATAR_EDIT",
				level: BotErrorLevel.Warning,
			});
		embed.setThumbnail(avatar);
		const embedsList = await replaceEmbedInList(ul, { embed, which: "user" }, message);

		await message.edit({ embeds: embedsList.list, files });
		const user = embed
			.toJSON()
			.fields?.find((field) => findln(field.name) === "common.user")?.value;
		const charName = embed
			.toJSON()
			.fields?.find((field) => findln(field.name) === "common.character")?.value;
		const nameMention =
			!charName || findln(charName) === "common.noSet" ? user : `${user} (${charName})`;
		const msgLink = message.url;
		await reply(interaction, {
			content: ul("edit.avatar.success", { link: msgLink, name: nameMention }),
			flags: Djs.MessageFlags.Ephemeral,
		});
		profiler.stopProfiler();
	}
}

// Export singleton instance
export const Avatar = new AvatarFeature();
