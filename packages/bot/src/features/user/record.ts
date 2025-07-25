import { isNumber, type StatisticalTemplate } from "@dicelette/core";
import type { Translation } from "@dicelette/types";
import { cleanAvatarUrl, NoChannel, verifyAvatarUrl } from "@dicelette/utils";
import type { EClient } from "client";
import { getTemplateByInteraction } from "database";
import * as Djs from "discord.js";
import { Dice, Stats } from "features";
import { embedError, reply } from "messages";
import {
	continueCancelButtons,
	fetchChannel,
	getLangAndConfig,
	isUserNameOrId,
} from "utils";

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
	const template = await getTemplateByInteraction(interaction, client);
	if (!template) {
		await reply(interaction, {
			embeds: [
				embedError(
					ul("error.template.notFound", {
						guildId: interaction.guild?.name ?? interaction.guildId,
					}),
					ul
				),
			],
		});
		return;
	}
	await Stats.register(
		interaction,
		template,
		Number.parseInt(pageNumber, 10),
		getLangAndConfig(client, interaction).langToUse
	);
}

/**
 * Handles the submission of the first page of a statistics registration modal in a Discord guild.
 *
 * If the interaction is valid and a corresponding template is found, generates and displays the initial embed for user statistics registration.
 */
export async function firstPage(
	interaction: Djs.ModalSubmitInteraction,
	client: EClient
) {
	if (!interaction.guild || !interaction.channel || interaction.channel.isDMBased())
		return;
	const template = await getTemplateByInteraction(interaction, client);
	if (!template) return;
	await createFirstPage(interaction, template, client);
}

/**
 * Creates and sends an embed summarizing user registration details from a modal interaction.
 *
 * If the provided template includes statistics, displays a continue/cancel button; otherwise, displays dice-related buttons. Handles user and channel resolution, avatar verification, and privacy settings. Sends error embeds if the user or channel cannot be found.
 *
 * @param interaction - The modal interaction containing user input fields.
 * @param template - The statistical template used to determine embed content and button type.
 * @param client - The settings object for retrieving guild-specific configuration.
 *
 * @throws {NoChannel} If the interaction channel is missing.
 */
async function createFirstPage(
	interaction: Djs.ModalSubmitInteraction,
	template: StatisticalTemplate,
	client: EClient
) {
	const { ul } = getLangAndConfig(client, interaction);
	const channel = interaction.channel;
	if (!channel) {
		throw new NoChannel();
	}
	const selfRegister = selfRegisterAllowance(
		client.settings.get(interaction.guild!.id, "allowSelfRegister")
	);
	const moderator = interaction.guild?.members.cache
		.get(interaction.user.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	const userFromField =
		!selfRegister.allowSelfRegister || moderator
			? interaction.fields.getTextInputValue("userID")
			: interaction.user.id;

	const user = await isUserNameOrId(userFromField, interaction);
	if (!user) {
		await reply(interaction, {
			embeds: [embedError(ul("error.user.notFound"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	const customChannel =
		(!selfRegister.disallowChannel && selfRegister.allowSelfRegister) || moderator
			? interaction.fields.getTextInputValue("channelId")
			: "";
	const charName = interaction.fields.getTextInputValue("charName");
	const isPrivate = client.settings.get(interaction.guild!.id, "privateChannel")
		? interaction.fields.getTextInputValue("private")?.toLowerCase() === "x"
		: false;
	const avatar = cleanAvatarUrl(interaction.fields.getTextInputValue("avatar"));
	let sheetId = client.settings.get(interaction.guild!.id, "managerId");
	const privateChannel = client.settings.get(interaction.guild!.id, "privateChannel");
	if (isPrivate && privateChannel) sheetId = privateChannel;
	if (customChannel.length > 0) sheetId = customChannel;

	const verifiedAvatar = avatar.length > 0 ? verifyAvatarUrl(avatar) : "";
	const existChannel = sheetId
		? await fetchChannel(interaction.guild!, sheetId)
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
			{
				name: ul("common.user"),
				value: Djs.userMention(user.id),
				inline: true,
			},
			{
				name: ul("common.isPrivate"),
				value: isPrivate ? "✓" : "✕",
				inline: true,
			}
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
			content:
				verifiedAvatar !== false
					? ""
					: `:warning: **${ul("error.avatar.url")}** \n-# *${ul("edit_avatar.default")}*`,
			embeds: [embed],
			components: [continueCancelButtons(ul)],
		});
		return;
	}
	const allButtons = Dice.buttons(ul);

	await reply(interaction, { embeds: [embed], components: [allButtons] });
}

function selfRegisterAllowance(value?: string | boolean) {
	if (typeof value === "boolean")
		return {
			moderation: false,
			disallowChannel: false,
			allowSelfRegister: value,
		};
	if (typeof value === "string") {
		const res = {
			moderation: false,
			disallowChannel: false,
			allowSelfRegister: true,
		};
		if (value.startsWith("moderation")) res.moderation = true;
		if (value.endsWith("_channel")) {
			const listValue = value.split("_"); // expected ["true", "channel"], ["false", "channel"], ["moderation", "channel"]
			if (listValue.length === 2) {
				res.allowSelfRegister = listValue[0] === "true" || listValue[0] === "moderation";
				res.disallowChannel = listValue[1] === "channel";
			}
		}
		return res;
	}
	return {
		moderation: false,
		disallowChannel: false,
		allowSelfRegister: false,
	};
}
