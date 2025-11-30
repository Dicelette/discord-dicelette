import { findln } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	COMPILED_PATTERNS,
	cleanAvatarUrl,
	verifyAvatarUrl,
} from "@dicelette/utils";
import type { TextChannel } from "discord.js";
import * as Djs from "discord.js";
import { embedError, getEmbeds, replaceEmbedInList, reply } from "messages";

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
export async function edit(interaction: Djs.ModalSubmitInteraction, ul: Translation) {
	if (!interaction.message) return;
	const message = await (interaction.channel as TextChannel).messages.fetch(
		interaction.message.id
	);
	await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
	const files: Djs.AttachmentBuilder[] = [];
	const uploaded = interaction.fields.getUploadedFiles("avatarFile")?.first();
	let avatar = "";

	if (uploaded) {
		if (!uploaded.contentType?.match(COMPILED_PATTERNS.VALID_EXTENSIONS))
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
		if (input.match(COMPILED_PATTERNS.DISCORD_CDN))
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
}
