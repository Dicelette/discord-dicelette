import { findln, ln, t } from "@dicelette/localization";
import type { Settings, UserData } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import { verifyIfEmbedInDB } from "database";
import * as Djs from "discord.js";
import { embedError, ensureEmbed, reply } from "messages";

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
				embeds: [embedError(ul("error.oldEmbed", { fiche: urlNew }), ul)],
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
	if (!userId.match(/\d+/))
		return (await interaction.guild!.members.fetch({ query: userId })).first();
	return await interaction.guild!.members.fetch({ user: userId });
}
export function serializeName(
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

export async function optionInteractions(
	interaction: Djs.CommandInteraction,
	client: EClient
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const guildData = client.settings.get(interaction.guildId as string);
	const lang = guildData?.lang ?? interaction.locale;
	const ul = ln(lang);
	if (!guildData) {
		await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
		return;
	}
	const user = options.getUser(t("display.userLowercase"));
	return { options, guildData, lang, ul, user };
}

export function isValidChannel(
	channel: Djs.GuildBasedChannel | null | undefined,
	interaction: Djs.CommandInteraction | Djs.BaseInteraction
) {
	return (
		channel &&
		!channel.isVoiceBased() &&
		!channel.isDMBased() &&
		channel.isTextBased() &&
		interaction.guild &&
		channel.type !== Djs.ChannelType.GuildAnnouncement &&
		channel.type !== Djs.ChannelType.AnnouncementThread
	);
}

export function getLangAndConfig(db: Settings, interaction: Djs.CommandInteraction) {
	const langToUser =
		db.get(interaction.guild!.id, "lang") ??
		interaction.guild!.preferredLocale ??
		interaction.locale;
	const ul = ln(langToUser);
	const config = db.get(interaction.guild!.id);
	return { langToUser, ul, config };
}
