import { NoChannel } from "@dicelette:utils/errors";
import type { StatisticalTemplate } from "@dicelette/core";
import { ln } from "@dicelette/localization";
import type { Settings, Translation } from "@dicelette/types";
import { verifyAvatarUrl } from "@dicelette/utils";
import { continueCancelButtons, registerDmgButton } from "buttons";
import { getTemplateWithDB } from "database/get_template";
import * as Djs from "discord.js";
import { embedError } from "messages/embeds";
import { reply } from "messages/send";
import { embedStatistiques } from "modals/stats";
import { isUserNameOrId } from "utils/check";

/**
 * Register the statistic in the embed when registering a new user and validate the modal
 * Also verify if the template is registered before embedding the statistics
 */
export async function pageNumber(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	db: Settings
) {
	const pageNumber = Number.parseInt(interaction.customId.replace("page", ""), 10);
	if (Number.isNaN(pageNumber)) return;
	const template = await getTemplateWithDB(interaction, db);
	if (!template) {
		await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
		return;
	}
	await embedStatistiques(
		interaction,
		template,
		pageNumber,
		db.get(interaction.guild!.id, "lang") ?? interaction.locale
	);
}

/**
 * Submit the first page when the modal is validated
 */
export async function recordFirstPage(
	interaction: Djs.ModalSubmitInteraction,
	db: Settings
) {
	if (!interaction.guild || !interaction.channel || interaction.channel.isDMBased())
		return;
	const template = await getTemplateWithDB(interaction, db);
	if (!template) return;
	await createEmbedFirstPage(interaction, template, db);
}

/**
 * Create the embed after registering the user
 * If the template has statistics, show the continue button
 * Else show the dice button
 */
export async function createEmbedFirstPage(
	interaction: Djs.ModalSubmitInteraction,
	template: StatisticalTemplate,
	setting: Settings
) {
	const lang = setting.get(interaction.guild!.id, "lang") ?? interaction.locale;
	const ul = ln(lang);
	const channel = interaction.channel;
	if (!channel) {
		throw new NoChannel();
	}
	const userFromField = interaction.fields.getTextInputValue("userID");
	const user = await isUserNameOrId(userFromField, interaction);
	if (!user) {
		reply(interaction, { embeds: [embedError(ul("error.user"), ul)], ephemeral: true });
		return;
	}
	const customChannel = interaction.fields.getTextInputValue("channelId");
	const charName = interaction.fields.getTextInputValue("charName");
	const isPrivate =
		interaction.fields.getTextInputValue("private")?.toLowerCase() === "x";
	const avatar = interaction.fields.getTextInputValue("avatar");

	let sheetId = setting.get(interaction.guild!.id, "managerId");
	const privateChannel = setting.get(interaction.guild!.id, "privateChannel");
	if (isPrivate && privateChannel) sheetId = privateChannel;
	if (customChannel.length > 0) sheetId = customChannel;

	const verifiedAvatar = verifyAvatarUrl(avatar);
	const existChannel = sheetId
		? await interaction.guild?.channels.fetch(sheetId)
		: undefined;
	if (!existChannel) {
		reply(interaction, {
			embeds: [embedError(ul("error.noThread"), ul)],
			ephemeral: true,
		});
		return;
	}
	const embed = new Djs.EmbedBuilder()
		.setTitle(ul("embed.add"))
		.setThumbnail(verifiedAvatar ? avatar : user.displayAvatarURL())
		.setFooter({ text: ul("common.page", { nb: 1 }) })
		.addFields(
			{
				name: ul("common.charName"),
				value: charName.length > 0 ? charName : ul("common.noSet"),
				inline: true,
			},
			{ name: ul("common.user"), value: Djs.userMention(user.id), inline: true },
			{ name: ul("common.isPrivate"), value: isPrivate ? "✓" : "✕", inline: true }
		);
	if (sheetId) {
		embed.addFields({ name: "_ _", value: "_ _", inline: true });
		embed.addFields({
			name: ul("common.channel").capitalize(),
			value: `${Djs.channelMention(sheetId as string)}`,
			inline: true,
		});
		embed.addFields({ name: "_ _", value: "_ _", inline: true });
	}

	//add continue button
	if (template.statistics) {
		await reply(interaction, {
			content: verifiedAvatar
				? ""
				: `:warning: **${ul("error.avatar.url")}** *${ul("edit_avatar.default")}*`,
			embeds: [embed],
			components: [continueCancelButtons(ul)],
		});
		return;
	}
	const allButtons = registerDmgButton(ul);
	await reply(interaction, { embeds: [embed], components: [allButtons] });
}
