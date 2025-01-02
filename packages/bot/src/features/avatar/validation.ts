import { findln } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import { verifyAvatarUrl } from "@dicelette/utils";
import * as Djs from "discord.js";
import { embedError, getEmbeds, getEmbedsList, reply } from "messages";

export async function validateAvatarEdit(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation
) {
	if (!interaction.message) return;
	const avatar = interaction.fields.getTextInputValue("avatar");
	if (avatar.match(/(cdn|media)\.discordapp\.net/gi))
		return await reply(interaction, {
			embeds: [embedError(ul("error.avatar.discord"), ul)],
		});
	if (!verifyAvatarUrl(avatar))
		return await reply(interaction, { embeds: [embedError(ul("error.avatar.url"), ul)] });

	const embed = getEmbeds(ul, interaction.message, "user");
	if (!embed) throw new Error(ul("error.noEmbed"));
	embed.setThumbnail(avatar);
	const embedsList = getEmbedsList(ul, { which: "user", embed }, interaction.message);
	await interaction.message.edit({ embeds: embedsList.list });
	const user = embed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.user")?.value;
	const charName = embed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.character")?.value;
	const nameMention =
		!charName || findln(charName) === "common.noSet" ? user : `${user} (${charName})`;
	const msgLink = interaction.message.url;
	await reply(interaction, {
		content: ul("edit_avatar.success", { name: nameMention, link: msgLink }),
		flags: Djs.MessageFlags.Ephemeral,
	});
}
