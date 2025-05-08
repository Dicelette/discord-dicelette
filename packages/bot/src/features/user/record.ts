import { isNumber, type StatisticalTemplate } from "@dicelette/core";
import type { Settings, Translation } from "@dicelette/types";
import { cleanAvatarUrl, logger, NoChannel, verifyAvatarUrl } from "@dicelette/utils";
import type { EClient } from "client";
import { getTemplateWithInteraction } from "database";
import * as Djs from "discord.js";
import { registerDmgButton, registerStatistics } from "features";
import { embedError, reply } from "messages";
import { continueCancelButtons, getLangAndConfig, isUserNameOrId } from "utils";

/**
 * Handles a modal submission to register user statistics for a specific page, validating the page number and template existence.
 *
 * If the template is not found, replies with an error embed.
 *
 * @param interaction - The modal interaction containing the page number in its custom ID.
 * @param ul - The translation utility for localized messages.
 * @param client - The Discord client instance.
 */
export async function pageNumber(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	client: EClient
) {
	const pageNumber = interaction.customId.replace("page", "");
	if (!isNumber(pageNumber)) return;
	const template = await getTemplateWithInteraction(interaction, client);
	if (!template) {
		await reply(interaction, { embeds: [embedError(ul("error.template.notFound"), ul)] });
		return;
	}
	await registerStatistics(
		interaction,
		template,
		Number.parseInt(pageNumber, 10),
		client.settings.get(interaction.guild!.id, "lang") ?? interaction.locale
	);
}

/**
 * Handles the submission of the first page of a statistics registration modal in a Discord guild.
 *
 * If the interaction is valid and a corresponding template is found, generates and displays the initial embed for user statistics registration.
 */
export async function recordFirstPage(
	interaction: Djs.ModalSubmitInteraction,
	client: EClient
) {
	if (!interaction.guild || !interaction.channel || interaction.channel.isDMBased())
		return;
	const template = await getTemplateWithInteraction(interaction, client);
	if (!template) return;
	await createEmbedFirstPage(interaction, template, client.settings);
}

/**
 * Creates and sends an embed summarizing user registration details from a modal interaction.
 *
 * If the provided template includes statistics, displays a continue/cancel button; otherwise, displays dice-related buttons. Handles user and channel resolution, avatar verification, and privacy settings. Sends error embeds if the user or channel cannot be found.
 *
 * @param interaction - The modal interaction containing user input fields.
 * @param template - The statistical template used to determine embed content and button type.
 * @param setting - The settings object for retrieving guild-specific configuration.
 *
 * @throws {NoChannel} If the interaction channel is missing.
 */
export async function createEmbedFirstPage(
	interaction: Djs.ModalSubmitInteraction,
	template: StatisticalTemplate,
	setting: Settings
) {
	const { ul } = getLangAndConfig(setting, interaction);
	const channel = interaction.channel;
	if (!channel) {
		throw new NoChannel();
	}
	const userFromField = interaction.fields.getTextInputValue("userID");
	const user = await isUserNameOrId(userFromField, interaction);
	if (!user) {
		await reply(interaction, {
			embeds: [embedError(ul("error.user.notFound"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const customChannel = interaction.fields.getTextInputValue("channelId");
	const charName = interaction.fields.getTextInputValue("charName");
	const isPrivate =
		interaction.fields.getTextInputValue("private")?.toLowerCase() === "x";
	const avatar = cleanAvatarUrl(interaction.fields.getTextInputValue("avatar"));
	logger.trace("avatar", avatar);
	let sheetId = setting.get(interaction.guild!.id, "managerId");
	const privateChannel = setting.get(interaction.guild!.id, "privateChannel");
	if (isPrivate && privateChannel) sheetId = privateChannel;
	if (customChannel.length > 0) sheetId = customChannel;

	const verifiedAvatar = verifyAvatarUrl(avatar);
	const existChannel = sheetId
		? await interaction.guild?.channels.fetch(sheetId)
		: undefined;
	if (!existChannel) {
		await reply(interaction, {
			embeds: [embedError(ul("error.channel.thread"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
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
