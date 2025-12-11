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
import { BaseFeature, type FeatureContext } from "./base";

/**
 * Avatar feature class - handles avatar editing operations
 * Uses instance properties to store context and reduce parameter passing
 */
export class AvatarFeature extends BaseFeature {
	constructor(context: FeatureContext) {
		super(context);
	}

	/**
	 * Handles the start of avatar editing from a select menu interaction
	 */
	async start(): Promise<void> {
		const interaction = this.interaction as Djs.StringSelectMenuInteraction;
		if (!this.db) return; // db is required for Avatar
		if (await allowEdit(interaction, this.db, this.interactionUser))
			await this.showAvatarEdit(interaction);
	}

	/**
	 * Displays a modal for editing a user's avatar, pre-filling the input with the current avatar URL.
	 *
	 * @throws {Error} If the user embed is not found in the interaction message.
	 */
	private async showAvatarEdit(
		interaction: Djs.StringSelectMenuInteraction
	): Promise<void> {
		const embed = getEmbeds(interaction.message, "user");
		if (!embed)
			throw new BotError(this.ul("error.embed.notFound"), {
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
			.setTitle(this.ul("button.avatar.description"))
			.addLabelComponents((label) =>
				label
					.setLabel(this.ul("modals.avatar.name"))
					.setDescription(this.ul("modals.avatar.description"))
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
					.setLabel(this.ul("modals.avatar.name"))
					.setDescription(this.ul("modals.avatar.file.description"))
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
	 * @throws {Error} If the user embed is not found in the message.
	 */
	async edit(): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
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
					embeds: [embedError(this.ul("error.avatar.format"), this.ul)],
				});
			const attachment = new Djs.AttachmentBuilder(uploaded.url, { name: uploaded.name });
			files.push(attachment);
			avatar = `attachment://${attachment.name}`;
		} else {
			const input = cleanAvatarUrl(interaction.fields.getTextInputValue("avatar"));
			if (!input)
				return await reply(interaction, {
					embeds: [embedError(this.ul("error.avatar.missing"), this.ul)],
				});
			if (input.match(QUERY_URL_PATTERNS.DISCORD_CDN))
				return await reply(interaction, {
					embeds: [embedError(this.ul("error.avatar.cdn"), this.ul)],
				});
			if (!verifyAvatarUrl(input))
				return await reply(interaction, {
					embeds: [embedError(this.ul("error.avatar.url"), this.ul)],
				});
			avatar = input;
		}

		const embed = getEmbeds(message, "user");
		if (!embed)
			throw new BotError(this.ul("error.embed.notFound"), {
				cause: "AVATAR_EDIT",
				level: BotErrorLevel.Warning,
			});
		embed.setThumbnail(avatar);
		const embedsList = await replaceEmbedInList(this.ul, { embed, which: "user" }, message);

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
			content: this.ul("edit.avatar.success", { link: msgLink, name: nameMention }),
			flags: Djs.MessageFlags.Ephemeral,
		});
		profiler.stopProfiler();
	}
}
