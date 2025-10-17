import { t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import * as Djs from "discord.js";

export async function editMeCommand(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
	await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
	const options = interaction.options as Djs.CommandInteractionOptionResolver;

	const editOptions: Djs.GuildMemberEditMeOptions = {
		nick: options.getString(t("editMe.nick.name")) ?? undefined,
		bio: options.getString(t("editMe.bio.name")) ?? undefined,
		avatar: await convertToBase64(options.getAttachment(t("editMe.asset.name"))),
		banner: await convertToBase64(options.getAttachment(t("editMe.banner.name"))),
	};

	await interaction.guild!.members.editMe(editOptions);
	await interaction.editReply({
		content: ul("editMe.success"),
	});
}

async function convertToBase64(
	image: Djs.Attachment | null
): Promise<Buffer | undefined> {
	const imageUrl = image?.url;
	if (!imageUrl) return;
	const response = await fetch(imageUrl);
	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}
