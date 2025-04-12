import { findln } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import { cleanAvatarUrl, verifyAvatarUrl } from "@dicelette/utils";
import * as Djs from "discord.js";
import { embedError, getEmbeds, getEmbedsList, reply } from "messages";
import type { TextChannel } from "discord.js";

export async function validateAvatarEdit(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation
) {
	if (!interaction.message) return;
	const message = await (interaction.channel as TextChannel).messages.fetch(
		interaction.message.id
	);
	await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
	const avatar = cleanAvatarUrl(interaction.fields.getTextInputValue("avatar"));
	if (!verifyAvatarUrl(avatar))
		return await reply(interaction, { embeds: [embedError(ul("error.avatar.url"), ul)] });

	const embed = getEmbeds(ul, message, "user");
	if (!embed) throw new Error(ul("error.noEmbed"));
	embed.setThumbnail(avatar);
	const embedsList = getEmbedsList(ul, { which: "user", embed }, message);
	await message.edit({ embeds: embedsList.list });
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
		content: ul("edit_avatar.success", { name: nameMention, link: msgLink }),
		flags: Djs.MessageFlags.Ephemeral,
	});
}
