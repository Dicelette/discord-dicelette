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
import type { Feature } from "./base";

/**
 * Avatar feature class - handles avatar editing operations
 */
export class AvatarFeature implements Feature {
	private interaction: Djs.StringSelectMenuInteraction | Djs.ModalSubmitInteraction;
	private ul: Translation;
	private interactionUser: Djs.User;
	private db?: Settings;

	constructor(
		interaction: Djs.StringSelectMenuInteraction | Djs.ModalSubmitInteraction,
		ul: Translation,
		interactionUser: Djs.User,
		db?: Settings
	) {
		this.interaction = interaction;
		this.ul = ul;
		this.interactionUser = interactionUser;
		this.db = db;
	}

	/**
	 * Handles the start of avatar editing from a select menu interaction
	 */
	async start(): Promise<void> {
		if (
			this.db &&
			this.interaction instanceof Djs.StringSelectMenuInteraction &&
			(await allowEdit(this.interaction, this.db, this.interactionUser))
		)
			await this.showAvatarEdit();
	}

	/**
	 * Displays a modal for editing a user's avatar, pre-filling the input with the current avatar URL.
	 *
	 * @throws {Error} If the user embed is not found in the interaction message.
	 */
	private async showAvatarEdit(): Promise<void> {
		if (!(this.interaction instanceof Djs.StringSelectMenuInteraction)) return;
		const embed = getEmbeds(this.interaction.message, "user");
		if (!embed)
			throw new BotError(this.ul("error.embed.notFound"), {
				cause: "AVATAR_EDIT",
				level: BotErrorLevel.Warning,
			});
		const jsonEmbed = embed.toJSON().thumbnail?.url;
		let thumbnail = jsonEmbed
			? cleanAvatarUrl(jsonEmbed)
			: await fetchAvatarUrl(this.interaction.guild!, this.interaction.user);
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

		await this.interaction.showModal(modal);
	}

	/**
	 * Handles a Discord modal submission to update a user's avatar in an embed message.
	 *
	 * Validates the provided avatar URL, updates the embed's thumbnail if valid, edits the original message with the new embed, and sends an ephemeral confirmation reply to the user.
	 *
	 * @throws {Error} If the user embed is not found in the message.
	 */
	async edit(): Promise<void> {
		if (!(this.interaction instanceof Djs.ModalSubmitInteraction)) return;
		if (!this.interaction.message) return;
		profiler.startProfiler();
		const message = await (this.interaction.channel as TextChannel).messages.fetch(
			this.interaction.message.id
		);
		await this.interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const files: Djs.AttachmentBuilder[] = [];
		const uploaded = this.interaction.fields.getUploadedFiles("avatarFile")?.first();
		let avatar = "";

		if (uploaded) {
			if (!uploaded.contentType?.match(QUERY_URL_PATTERNS.VALID_EXTENSIONS)) {
				await reply(this.interaction, {
					embeds: [embedError(this.ul("error.avatar.format"), this.ul)],
				});
				return;
			}
			const attachment = new Djs.AttachmentBuilder(uploaded.url, { name: uploaded.name });
			files.push(attachment);
			avatar = `attachment://${attachment.name}`;
		} else {
			const input = cleanAvatarUrl(this.interaction.fields.getTextInputValue("avatar"));
			if (!input) {
				await reply(this.interaction, {
					embeds: [embedError(this.ul("error.avatar.missing"), this.ul)],
				});
				return;
			}
			if (input.match(QUERY_URL_PATTERNS.DISCORD_CDN)) {
				await reply(this.interaction, {
					embeds: [embedError(this.ul("error.avatar.cdn"), this.ul)],
				});
				return;
			}
			if (!verifyAvatarUrl(input)) {
				await reply(this.interaction, {
					embeds: [embedError(this.ul("error.avatar.url"), this.ul)],
				});
				return;
			}
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
		await reply(this.interaction, {
			content: this.ul("edit.avatar.success", { link: msgLink, name: nameMention }),
			flags: Djs.MessageFlags.Ephemeral,
		});
		profiler.stopProfiler();
	}
}
