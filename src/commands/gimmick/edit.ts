import { deleteUser } from "@events/on_delete";
import { verifyAvatarUrl } from "@interactions/register/validate";
import type {
	DiscordChannel,
	PersonnageIds,
	Translation,
	UserMessageId,
	UserRegistration,
} from "@interface";
import { cmdLn, findln, ln } from "@localization";
import type { EClient } from "@main";
import { embedError, filterChoices, haveAccess, reply, searchUserChannel } from "@utils";
import { editUserButtons, selectEditMenu } from "@utils/buttons";
import { getDatabaseChar, registerUser } from "@utils/db";
import { getEmbeds, getEmbedsList } from "@utils/parse";
import * as Djs from "discord.js";

import i18next from "i18next";

const t = i18next.getFixedT("en");
export const editAvatar = {
	data: new Djs.SlashCommandBuilder()
		.setName("edit")
		.setDescription(t("edit.desc"))
		.setDescriptionLocalizations(cmdLn("edit.desc"))
		.setDefaultMemberPermissions(0)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("edit_avatar.name"))
				.setNameLocalizations(cmdLn("edit_avatar.name"))
				.setDescription(t("edit_avatar.desc"))
				.setDescriptionLocalizations(cmdLn("edit_avatar.desc"))
				.addStringOption((option) =>
					option
						.setName(t("edit_avatar.url.name"))
						.setNameLocalizations(cmdLn("edit_avatar.url.name"))
						.setDescription(t("edit_avatar.url.desc"))
						.setDescriptionLocalizations(cmdLn("edit_avatar.url.desc"))
						.setRequired(true)
				)
				.addUserOption((option) =>
					option
						.setName(t("display.userLowercase"))
						.setNameLocalizations(cmdLn("display.userLowercase"))
						.setDescription(t("edit_avatar.user"))
						.setDescriptionLocalizations(cmdLn("edit_avatar.user"))
				)
				.addStringOption((option) =>
					option
						.setName(t("common.character"))
						.setNameLocalizations(cmdLn("common.character"))
						.setDescriptionLocalizations(cmdLn("edit_avatar.character"))
						.setDescription(t("edit_avatar.character"))
						.setAutocomplete(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("edit.rename.title"))
				.setDescription(t("edit.rename.desc"))
				.addStringOption((option) =>
					option
						.setName(t("edit.rename.option.title"))
						.setDescription(t("edit.rename.option.desc"))
						.setNameLocalizations(cmdLn("edit.rename.option.title"))
						.setDescriptionLocalizations(cmdLn("edit.rename.option.desc"))
						.setRequired(true)
				)
				.addUserOption((option) =>
					option
						.setName(t("display.userLowercase"))
						.setNameLocalizations(cmdLn("display.userLowercase"))
						.setDescription(t("edit_avatar.user"))
						.setDescriptionLocalizations(cmdLn("edit_avatar.user"))
				)
				.addStringOption((option) =>
					option
						.setName(t("common.character"))
						.setNameLocalizations(cmdLn("common.character"))
						.setDescriptionLocalizations(cmdLn("edit_avatar.character"))
						.setDescription(t("edit_avatar.character"))
						.setAutocomplete(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("edit.user.title"))
				.setDescription(t("edit.user.desc"))
				.setDescriptionLocalizations(cmdLn("edit.user.desc"))
				.setNameLocalizations(cmdLn("edit.user.title"))
				.addUserOption((option) =>
					option
						.setName(t("edit.user.option.title"))
						.setDescription(t("edit.user.option.desc"))
						.setNameLocalizations(cmdLn("edit.user.option.title"))
						.setDescriptionLocalizations(cmdLn("edit.user.option.desc"))
						.setRequired(true)
				)
				.addUserOption((option) =>
					option
						.setName(t("display.userLowercase"))
						.setNameLocalizations(cmdLn("display.userLowercase"))
						.setDescription(t("edit_avatar.user"))
						.setDescriptionLocalizations(cmdLn("edit_avatar.user"))
				)
				.addStringOption((option) =>
					option
						.setName(t("common.character"))
						.setNameLocalizations(cmdLn("common.character"))
						.setDescriptionLocalizations(cmdLn("edit_avatar.character"))
						.setDescription(t("edit_avatar.character"))
						.setAutocomplete(true)
				)
		),
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guildId as string);
		if (!guildData) return;
		const choices: string[] = [];
		const lang = guildData.lang ?? interaction.locale;
		const ul = ln(lang);
		let userID = options.get(t("display.userLowercase"))?.value ?? interaction.user.id;
		if (typeof userID !== "string") userID = interaction.user.id;
		if (fixed.name === t("common.character")) {
			const guildChars = guildData.user[userID];
			if (!guildChars) return;
			for (const data of guildChars) {
				const allowed = haveAccess(interaction, data.messageId[1], userID);
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
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const guildData = client.settings.get(interaction.guildId as string);
		const lang = guildData?.lang ?? interaction.locale;
		const ul = ln(lang);
		if (!guildData) {
			await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
			return;
		}
		const user = options.getUser(t("display.userLowercase"));
		const isModerator = interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);

		if (user && user.id !== interaction.user.id && !isModerator) {
			await reply(interaction, { embeds: [embedError(ul("error.noPermission"), ul)] });
			return;
		}
		const charName = options.getString(t("common.character"))?.toLowerCase();
		const charData = await getDatabaseChar(interaction, client, t);
		if (!charData) {
			let userName = `<@${user?.id ?? interaction.user.id}>`;
			if (charName) userName += ` (${charName})`;
			await reply(interaction, {
				embeds: [embedError(ul("error.userNotRegistered", { user: userName }), ul)],
			});
			return;
		}
		const userData = charData[user?.id ?? interaction.user.id];
		const sheetLocation: PersonnageIds = {
			channelId: userData.messageId[1],
			messageId: userData.messageId[0],
		};
		const thread = await searchUserChannel(
			client.settings,
			interaction,
			ul,
			sheetLocation?.channelId
		);
		if (!thread)
			return await reply(interaction, { embeds: [embedError(ul("error.noThread"), ul)] });

		const allowHidden = haveAccess(
			interaction,
			thread.id,
			user?.id ?? interaction.user.id
		);
		if (!allowHidden && charData[user?.id ?? interaction.user.id]?.isPrivate) {
			await reply(interaction, { embeds: [embedError(ul("error.private"), ul)] });
			return;
		}
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
		const imageURL = options.getString(t("edit_avatar.url.name"), true);
		if (imageURL.match(/(cdn|media)\.discordapp\.net/gi))
			return await reply(interaction, {
				embeds: [embedError(ul("error.avatar.discord"), ul)],
			});
		if (!verifyAvatarUrl(imageURL))
			return await reply(interaction, {
				embeds: [embedError(ul("error.avatar.url"), ul)],
			});
		const message = await thread!.messages.fetch(sheetLocation.messageId);
		const embed = getEmbeds(ul, message, "user");
		if (!embed) throw new Error(ul("error.noEmbed"));
		embed.setThumbnail(imageURL);
		const embedsList = getEmbedsList(ul, { which: "user", embed }, message);
		//update button
		await generateButton(message, ul, embedsList.list);

		const nameMention = `<@${user?.id ?? interaction.user.id}>${charName ? ` (${charName})` : ""}`;
		const msgLink = message.url;
		await reply(interaction, {
			content: ul("edit_avatar.success", { name: nameMention, link: msgLink }),
			ephemeral: true,
		});
	} catch (error) {
		await reply(interaction, { embeds: [embedError(ul("error.user"), ul)] });
	}
}

async function generateButton(
	message: Djs.Message,
	ul: Translation,
	embedsList: Djs.EmbedBuilder[]
) {
	const oldsButtons = message.components;

	const haveStats = oldsButtons.some((row) =>
		row.components.some((button) => button.customId === "edit_stats")
	);
	const haveDice = oldsButtons.some((row) =>
		row.components.some((button) => button.customId === "edit_dice")
	);
	const buttons = editUserButtons(ul, haveStats, haveDice);
	const select = selectEditMenu(ul);
	await message.edit({ embeds: embedsList, components: [buttons, select] });
}

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
	const embed = getEmbeds(ul, message, "user");
	if (!embed) throw new Error(ul("error.noEmbed"));
	const n = embed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.character");
	if (!n) throw new Error(ul("error.noCharacter"));
	n.value = name;
	//update the embed
	const embedsList = getEmbedsList(ul, { which: "user", embed }, message);
	//update the database
	const userRegister: UserRegistration = {
		userID: user?.id ?? interaction.user.id,
		charName: name,
		damage: oldData.damageName,
		msgId: oldData.messageId,
	};
	try {
		await registerUser(userRegister, interaction, client.settings, false, true);
	} catch (error) {
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
		content: ul("edit_name.success", { url: message.url }),
		ephemeral: true,
	});
}

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
	const embed = getEmbeds(ul, message, "user");
	if (!embed) throw new Error(ul("error.noEmbed"));
	const n = embed.toJSON().fields?.find((field) => findln(field.name) === "common.user");

	if (!n) throw new Error(ul("error.oldEmbed"));
	n.value = `<@${newUser.id}>`;
	//update the embed
	const embedsList = getEmbedsList(ul, { which: "user", embed }, message);
	//update the database, with deleting the old data

	//add the new data to the database
	const userRegister: UserRegistration = {
		userID: newUser.id,
		charName: oldData.charName,
		damage: oldData.damageName,
		msgId: oldData.messageId,
	};
	try {
		registerUser(userRegister, interaction, client.settings, false, true);
	} catch (error) {
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
	const newdata = deleteUser(interaction, guildData!, user, oldData.charName);
	//save the new data
	client.settings.set(interaction.guildId as string, newdata);
	await generateButton(message, ul, embedsList.list);
	await reply(interaction, {
		content: ul("edit.user.success", { url: message.url }),
		ephemeral: true,
	});
}

export function resetButton(message: Djs.Message, ul: Translation) {
	const oldsButtons = message.components;

	const haveStats = oldsButtons.some((row) =>
		row.components.some((button) => button.customId === "edit_stats")
	);
	const haveDice = oldsButtons.some((row) =>
		row.components.some((button) => button.customId === "edit_dice")
	);
	const buttons = editUserButtons(ul, haveStats, haveDice);
	const select = selectEditMenu(ul);
	return message.edit({ components: [buttons, select] });
}
