import { findln, ln, t } from "@dicelette/localization";
import type { Settings, UserData } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import { verifyIfEmbedInDB } from "database";
import * as Djs from "discord.js";
import { embedError, ensureEmbed, reply } from "messages";
import { getLangAndConfig } from "./fetch";

/**
 * Determines whether a user is permitted to edit a Discord message embed in an interaction.
 *
 * Checks if the user is the original embed author or has moderator permissions. If the interaction is not the initial ("first") type, verifies the embed's existence in the database. If the embed is missing, sends an ephemeral error message, attempts to delete the message, and denies permission. Otherwise, denies permission with an ephemeral message if the user lacks the required rights.
 *
 * @param interaction - The Discord button or select menu interaction.
 * @param db - The settings database instance.
 * @param interactionUser - The user attempting the edit.
 * @returns `true` if the user is allowed to edit; otherwise, `false`.
 */
export async function allowEdit(
	interaction: Djs.ButtonInteraction | Djs.StringSelectMenuInteraction,
	db: Settings,
	interactionUser: Djs.User
) {
	const ul = ln(interaction.locale as Djs.Locale);
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields
		.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	const isSameUser = user === interactionUser.id;
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	const first = interaction.customId.includes("first");
	const userName = embed.fields.find((field) =>
		["common.character", "common.charName"].includes(findln(field.name))
	);
	const userNameValue =
		userName && findln(userName?.value) === "common.noSet" ? undefined : userName?.value;
	if (!first && user) {
		const { isInDb, coord } = verifyIfEmbedInDB(
			db,
			interaction.message,
			user,
			userNameValue
		);
		if (!isInDb) {
			const urlNew = `https://discord.com/channels/${interaction.guild!.id}/${coord?.channelId}/${coord?.messageId}`;
			await reply(interaction, {
				embeds: [embedError(ul("error.embed.old", { fiche: urlNew }), ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			//delete the message
			try {
				await interaction.message.delete();
			} catch (e) {
				logger.warn("Error while deleting message", e, "allowEdit");
			}
			return false;
		}
	}
	if (isSameUser || isModerator) return true;
	await reply(interaction, {
		content: ul("modals.noPermission"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	return false;
}

export async function isUserNameOrId(
	userId: string,
	interaction: Djs.ModalSubmitInteraction
) {
	if (!userId.match(/^\d+$/))
		return (await interaction.guild!.members.fetch({ query: userId })).first();
	return await interaction.guild!.members.fetch({ user: userId });
}
export function isSerializedNameEquals(
	userStatistique: UserData | undefined,
	charName: string | undefined
) {
	const serializedNameDB = userStatistique?.userName?.standardize(true);
	const serializedNameQueries = charName?.standardize(true);
	return (
		serializedNameDB !== serializedNameQueries ||
		(serializedNameQueries && serializedNameDB?.includes(serializedNameQueries))
	);
}

/**
 * Extracts command interaction options, guild configuration, language, localization utility, and user from a Discord command interaction.
 *
 * Sends an error embed reply and returns nothing if the guild configuration is not found.
 *
 * @returns An object containing the interaction options, guild configuration, language, localization utility, and the user option.
 */
export async function optionInteractions(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const {
		langToUse: lang,
		config: guildData,
		ul,
	} = getLangAndConfig(client, interaction);
	if (!guildData) {
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
	const user = options.getUser(t("display.userLowercase"));
	return { options, guildData, lang, ul, user };
}

export function isValidChannel(
	channel: Djs.GuildBasedChannel | null | undefined | Djs.TextBasedChannel,
	_interaction: Djs.CommandInteraction | Djs.BaseInteraction
) {
	return (
		channel &&
		!channel.isVoiceBased() &&
		channel.isTextBased() &&
		channel.type !== Djs.ChannelType.GuildAnnouncement &&
		channel.type !== Djs.ChannelType.AnnouncementThread
	);
}

export function isValidInteraction(interaction: Djs.BaseInteraction) {
	return (
		interaction.type === Djs.InteractionType.ApplicationCommand ||
		interaction.type === Djs.InteractionType.MessageComponent ||
		interaction.type === Djs.InteractionType.ModalSubmit
	);
}

export function selfRegisterAllowance(value?: string | boolean) {
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
