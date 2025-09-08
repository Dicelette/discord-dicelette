import { findln, t } from "@dicelette/localization";
import type {
	DiscordChannel,
	PersonnageIds,
	Translation,
	UserMessageId,
	UserRegistration,
} from "@dicelette/types";
import { cleanAvatarUrl, filterChoices, logger, verifyAvatarUrl } from "@dicelette/utils";
import type { EClient } from "client";
import {
	deleteUser,
	getRecordChar,
	getUserByEmbed,
	moveUserInDatabase,
	registerUser,
} from "database";
import * as Djs from "discord.js";
import { embedError, findLocation, getEmbeds, getEmbedsList, reply } from "messages";
import {
	autoComplete,
	charUserOptions,
	getButton,
	haveAccess,
	optionInteractions,
} from "utils";
import "discord_ext";

export const editAvatar = {
	data: new Djs.SlashCommandBuilder()
		.setNames("edit.title")
		.setDescriptions("edit.desc")
		.setDefaultMemberPermissions(0)
		.addSubcommand(
			(subcommand) =>
				charUserOptions(
					subcommand
						.setNames("edit_avatar.name")
						.setDescriptions("edit_avatar.desc")
						.addStringOption((option) =>
							option
								.setNames("edit_avatar.url.name")
								.setDescriptions("edit_avatar.url.desc")
								.setRequired(true)
						)
				) as Djs.SlashCommandSubcommandBuilder
		)
		.addSubcommand(
			(subcommand) =>
				charUserOptions(
					subcommand
						.setNames("edit.rename.title")
						.setDescriptions("edit.rename.desc")
						.addStringOption((option) =>
							option
								.setNames("edit.rename.option.title")
								.setDescriptions("edit.rename.option.desc")
								.setRequired(true)
						)
				) as Djs.SlashCommandSubcommandBuilder
		)
		.addSubcommand(
			(subcommand) =>
				charUserOptions(
					subcommand
						.setNames("edit.user.title")
						.setDescriptions("edit.user.desc")
						.addUserOption((option) =>
							option
								.setNames("edit.user.option.title")
								.setDescriptions("edit.user.option.desc")
								.setRequired(true)
						)
				) as Djs.SlashCommandSubcommandBuilder
		),
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const param = autoComplete(interaction, client);
		if (!param) return;
		const { guildData, ul, userID, fixed, choices } = param;

		if (fixed.name === t("common.character")) {
			const guildChars = guildData.user[userID];
			if (!guildChars) return;
			for (const data of guildChars) {
				const allowed = await haveAccess(interaction, data.messageId[1], userID);
				const toPush = data.charName ? data.charName : ul("common.default");
				if (!data.isPrivate) choices.push(toPush);
				else if (allowed) choices.push(toPush);
			}
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({ name: result.capitalize(), value: result }))
		);
	},
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const int = await optionInteractions(interaction, client);
		if (!int) return;
		const { options, ul, user } = int;
		const isModerator = interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);

		if (user && user.id !== interaction.user.id && !isModerator) {
			await reply(interaction, { embeds: [embedError(ul("error.noPermission"), ul)] });
			return;
		}
		const charName = options.getString(t("common.character"))?.toLowerCase();
		const charData = await getRecordChar(interaction, client, t);
		if (!charData) {
			let userName = `<@${user?.id ?? interaction.user.id}>`;
			if (charName) userName += ` (${charName})`;
			await reply(interaction, {
				embeds: [embedError(ul("error.user.registered", { user: userName }), ul)],
			});
			return;
		}
		const userData = charData[user?.id ?? interaction.user.id];
		const { thread, sheetLocation } = await findLocation(
			userData,
			interaction,
			client,
			ul,
			charData,
			user
		);
		const subcommand = options.getSubcommand();
		if (subcommand === t("edit_avatar.name")) {
			await avatar(options, interaction, ul, user, charName, sheetLocation, thread);
		} else if (subcommand === t("edit.rename.title")) {
			await rename(
				options.getString(t("edit.rename.option.title"), true),
				interaction,
				ul,
				user,
				client,
				sheetLocation,
				userData,
				thread
			);
		} else if (subcommand === t("edit.user.title")) {
			await move(
				options.getUser(t("edit.user.option.title"), true),
				interaction,
				ul,
				user,
				client,
				sheetLocation,
				userData,
				thread
			);
		}
	},
};

/**
 * Updates a character's avatar image in the associated embed message.
 *
 * Validates and sets a new avatar URL for the character, updates the embed in the message thread, and provides a success message with a mention and message link. If the avatar URL is invalid or the embed is not found, replies with an appropriate error message.
 *
 * @param options - The command interaction options containing the new avatar URL.
 * @param interaction - The Discord command interaction context.
 * @param ul - The translation function for localized responses.
 * @param user - The user associated with the character, or null.
 * @param charName - The name of the character, if provided.
 * @param sheetLocation - Identifiers for the character's message and location.
 * @param thread - The Discord channel thread containing the character's message.
 */
async function avatar(
	options: Djs.CommandInteractionOptionResolver,
	interaction: Djs.CommandInteraction,
	ul: Translation,
	user: Djs.User | null,
	charName: string | undefined,
	sheetLocation: PersonnageIds,
	thread: DiscordChannel
) {
	try {
		const imageURL = cleanAvatarUrl(options.getString(t("edit_avatar.url.name"), true));
		if (!verifyAvatarUrl(imageURL))
			return await reply(interaction, {
				embeds: [embedError(ul("error.avatar.url"), ul)],
			});
		const message = await thread!.messages.fetch(sheetLocation.messageId);
		const embed = getEmbeds(message, "user");
		if (!embed) {
			// noinspection ExceptionCaughtLocallyJS
			throw new Error(ul("error.embed.notFound"));
		}
		embed.setThumbnail(imageURL);
		const embedsList = getEmbedsList({ which: "user", embed }, message);
		//update button
		await generateButton(message, ul, embedsList.list);

		const nameMention = `<@${user?.id ?? interaction.user.id}>${charName ? ` (${charName})` : ""}`;
		const msgLink = message.url;
		await reply(interaction, {
			content: ul("edit.avatar.success", { name: nameMention, link: msgLink }),
			flags: Djs.MessageFlags.Ephemeral,
		});
	} catch (error) {
		await reply(interaction, { embeds: [embedError(ul("error.user.notFound"), ul)] });
		logger.warn(error);
	}
}

async function generateButton(
	message: Djs.Message,
	ul: Translation,
	embedsList: Djs.EmbedBuilder[]
) {
	const { buttons, select } = getButton(message, ul);
	await message.edit({ embeds: embedsList, components: [buttons, select] });
}

/**
 * Renames a character in the associated embed message and updates the database and client cache.
 *
 * Updates the character's name in the embed, persists the change in the database, and synchronizes the client cache. Handles duplicate name errors and replies with localized success or error messages. Also updates message components and cleans up old user data in guild settings.
 *
 * @param name - The new name for the character.
 * @param interaction - The Discord interaction triggering the rename.
 * @param ul - Localization function for translations.
 * @param user - The user associated with the character, or null to use the interaction user.
 * @param client - The Discord bot client instance.
 * @param sheetLocation - Identifiers for the character's message and location.
 * @param oldData - Previous character data, including the old name and message ID.
 * @param thread - The Discord channel (thread) containing the character message.
 *
 * @throws {Error} If the embed or character field is not found in the message.
 */
export async function rename(
	name: string,
	interaction: Djs.CommandInteraction | Djs.ModalSubmitInteraction,
	ul: Translation,
	user: Djs.User | null,
	client: EClient,
	sheetLocation: PersonnageIds,
	oldData: {
		charName?: string | null;
		messageId: UserMessageId;
		damageName?: string[];
		isPrivate?: boolean;
	},
	thread: DiscordChannel
) {
	const message = await thread!.messages.fetch(sheetLocation.messageId);
	const embed = getEmbeds(message, "user");
	if (!embed) throw new Error(ul("error.embed.notFound"));
	const n = embed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.character");
	if (!n) throw new Error(ul("error.user.rename"));
	n.value = name;
	//update the embed
	const embedsList = getEmbedsList({ which: "user", embed }, message);
	//update the database
	const userRegister: UserRegistration = {
		userID: user?.id ?? interaction.user.id,
		charName: name,
		damage: oldData.damageName,
		msgId: oldData.messageId,
	};
	const oldChar = client.characters.get(
		interaction.guild!.id,
		user?.id ?? interaction.user.id
	);
	if (!oldChar) {
		const userData = getUserByEmbed({ message }, ul);
		if (!userData) return;
		userData.userName = name;
		client.characters.set(
			interaction.guild!.id,
			[userData],
			user?.id ?? interaction.user.id
		);
	} else {
		const oldCharData = oldChar.find((char) =>
			char.userName?.subText(oldData.charName, true)
		);
		if (!oldCharData) {
			const userData = getUserByEmbed({ message }, ul);
			if (!userData) return;
			userData.userName = name;
			client.characters.set(
				interaction.guild!.id,
				oldChar.push(userData),
				user?.id ?? interaction.user.id
			);
		} else {
			oldCharData.userName = name;
			client.characters.set(
				interaction.guild!.id,
				oldChar,
				user?.id ?? interaction.user.id
			);
		}
	}
	try {
		await registerUser(userRegister, interaction, client.settings, false, true);
	} catch (error) {
		logger.warn(error);
		if ((error as Error).message === "DUPLICATE")
			await reply(interaction, {
				embeds: [embedError(ul("error.duplicate"), ul, "duplicate")],
			});
		else
			await reply(interaction, {
				embeds: [embedError(ul("error.generic.e", { e: error }), ul, "unknown")],
			});
		await resetButton(message, ul);
		return;
	}
	const guildData = client.settings.get(interaction.guildId as string);
	const newdata = deleteUser(interaction, guildData!, user, oldData.charName);
	client.settings.set(interaction.guildId as string, newdata);
	await generateButton(message, ul, embedsList.list);
	await reply(interaction, {
		content: ul("edit.name.success", { url: message.url }),
		flags: Djs.MessageFlags.Ephemeral,
	});
}

/**
 * Changes the user associated with a character and updates all related data.
 *
 * Updates the character embed in the Discord message to mention the new user, moves the character data in the database from the old user to the new user, registers the new user, deletes the old user data from guild settings, updates message buttons, and replies with a localized success or error message.
 *
 * @param newUser - The user to associate with the character.
 * @param interaction - The Discord interaction triggering the change.
 * @param ul - Localization function for translations.
 * @param user - The previous user associated with the character, or null.
 * @param client - The Discord bot client instance.
 * @param sheetLocation - Identifiers for the character's message and location.
 * @param oldData - Data about the character and previous association.
 * @param thread - The Discord channel containing the character message.
 *
 * @throws {Error} If the character embed or user field is not found in the message.
 */
export async function move(
	newUser: Djs.User,
	interaction: Djs.CommandInteraction | Djs.ModalSubmitInteraction,
	ul: Translation,
	user: Djs.User | null,
	client: EClient,
	sheetLocation: PersonnageIds,
	oldData: {
		charName?: string | null;
		messageId: UserMessageId;
		damageName?: string[];
		isPrivate?: boolean;
	},
	thread: DiscordChannel
) {
	const message = await thread!.messages.fetch(sheetLocation.messageId);
	const embed = getEmbeds(message, "user");
	if (!embed) throw new Error(ul("error.embed.notFound"));
	const n = embed.toJSON().fields?.find((field) => findln(field.name) === "common.user");

	if (!n) throw new Error(ul("error.embed.old"));
	n.value = `<@${newUser.id}>`;
	//update the embed
	const embedsList = getEmbedsList({ which: "user", embed }, message);
	//update the database, with deleting the old data

	//add the new data to the database
	const userRegister: UserRegistration = {
		userID: newUser.id,
		charName: oldData.charName,
		damage: oldData.damageName,
		msgId: oldData.messageId,
	};
	await moveUserInDatabase(
		client,
		interaction.guild!,
		newUser.id,
		oldData.messageId,
		oldData.charName,
		user?.id
	);
	try {
		await registerUser(userRegister, interaction, client.settings, false, true);
	} catch (error) {
		logger.warn(error);
		if ((error as Error).message === "DUPLICATE")
			await reply(interaction, { embeds: [embedError(ul("error.duplicate"), ul)] });
		else
			await reply(interaction, {
				embeds: [embedError(ul("error.generic.e", { e: error }), ul)],
			});
		await resetButton(message, ul);
		return;
	}
	const guildData = client.settings.get(interaction.guildId as string);
	const newData = deleteUser(interaction, guildData!, user, oldData.charName);

	client.settings.set(interaction.guildId as string, newData);
	await generateButton(message, ul, embedsList.list);
	await reply(interaction, {
		content: ul("edit.user.success", { url: message.url }),
		flags: Djs.MessageFlags.Ephemeral,
	});
}

export async function resetButton(message: Djs.Message, ul: Translation) {
	const { buttons, select } = getButton(message, ul);
	return await message.edit({ components: [buttons, select] });
}
