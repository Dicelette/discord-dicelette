import type { EClient } from "@dicelette/client";
import { getInteractionContext as getLangAndConfig } from "@dicelette/helpers";
import { findln, ln, t } from "@dicelette/localization";
import type { Settings, UserData } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import { verifyIfEmbedInDB } from "database";
import * as Djs from "discord.js";
import { embedError, ensureEmbed, reply } from "messages";

/** Checks if a user may edit an embed: the original author or a moderator, and (unless "first") that the embed
 * still matches the DB — replying with an error and deleting the message if it's stale. */
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

/** Extracts interaction options, guild config, language, and translation function; replies with an error and
 * returns nothing if the guild isn't configured. */
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
	return { guildData, lang, options, ul, user };
}

export function isValidChannel(
	channel: Djs.GuildBasedChannel | null | undefined | Djs.TextBasedChannel,
	_interaction: Djs.CommandInteraction | Djs.BaseInteraction
) {
	if (!channel) return false;
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
			allowSelfRegister: value,
			disallowChannel: false,
			moderation: false,
		};
	if (typeof value === "string") {
		const res = {
			allowSelfRegister: true,
			disallowChannel: false,
			moderation: false,
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
		allowSelfRegister: false,
		disallowChannel: false,
		moderation: false,
	};
}
