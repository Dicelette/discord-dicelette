import { deleteUser } from "@events/on_delete";
import type { GuildData, PersonnageIds, UserMessageId } from "@interfaces/database";
import type { DiscordChannel, Translation } from "@interfaces/discord";
import { cmdLn, ln, t } from "@localization";
import { type EClient, logger } from "@main";
import { embedError, filterChoices, reply, searchUserChannel } from "@utils";
import { getDatabaseChar } from "@utils/db";
import * as Djs from "discord.js";

export const deleteChar = {
	async autocomplete(
		interaction: Djs.AutocompleteInteraction,
		client: EClient
	): Promise<void> {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guildId as string);
		if (!guildData) return;
		const choices: string[] = [];
		const lang = guildData.lang ?? interaction.locale;
		const ul = ln(lang);
		let user = options.get(t("display.userLowercase"))?.value;
		if (typeof user !== "string") user = interaction.user.id;
		if (fixed.name === t("common.character")) {
			const guildChars = guildData.user[user];
			if (!guildChars) return;
			for (const data of guildChars) {
				choices.push(data.charName ? data.charName : ul("common.default"));
			}
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({ name: result.capitalize(), value: result }))
		);
	},
	data: new Djs.SlashCommandBuilder()
		.setName(t("deleteChar.name"))
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("deleteChar.name"))
		.setDescription(t("deleteChar.description"))
		.setDescriptionLocalizations(cmdLn("deleteChar.description"))
		.addUserOption((option) =>
			option
				.setName(t("display.userLowercase"))
				.setNameLocalizations(cmdLn("display.userLowercase"))
				.setDescription(t("deleteChar.user"))
				.setDescriptionLocalizations(cmdLn("deleteChar.user"))
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName(t("common.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescriptionLocalizations(cmdLn("deleteChar.character"))
				.setDescription(t("deleteChar.character"))
				.setAutocomplete(true)
		),
	async execute(interaction: Djs.CommandInteraction, client: EClient): Promise<void> {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const guildData = client.settings.get(interaction.guildId as string);
		const lang = guildData?.lang ?? interaction.locale;
		const ul = ln(lang);
		if (!guildData) {
			await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
			return;
		}
		const user = options.getUser(t("display.userLowercase"));
		let charName = options.getString(t("common.character"))?.toLowerCase();
		const charData = await getDatabaseChar(interaction, client, t);
		const mention = Djs.userMention(user?.id ?? interaction.user.id);

		if (!charName) {
			//delete all characters from the user
			const allDataUser = client.settings.get(
				interaction.guild!.id,
				`user.${user?.id ?? interaction.user.id}`
			);
			if (!allDataUser) {
				await reply(
					interaction,
					ul("deleteChar.noCharacters", {
						user: Djs.userMention(user?.id ?? interaction.user.id),
					})
				);
				return;
			}
			//list all characters in allDataUser
			const allCharacters: string[] = allDataUser
				.map((data) => data.charName ?? "")
				.filter((data) => data.length > 0);
			let msg = ul("deleteChar.all", { user: mention });
			if (allCharacters.length === 1) {
				msg = ul("deleteChar.allOne", {
					user: `${mention} *(__${ul("common.character")}__${ul("common.space")}: ${allCharacters[0]})*`,
				});
			} else if (allCharacters.length > 1) {
				const allChars = allCharacters.join("\n- ");
				msg = ul("deleteChar.allMany", { user: mention, chara: allChars });
			}
			const rep = await confirmToDelete(interaction, ul, user ?? interaction.user, msg);

			const collectorFilter = (i: { user: { id: string | undefined } }) =>
				i.user.id === (user?.id ?? interaction.user.id);
			try {
				const confirm = await rep.awaitMessageComponent({
					filter: collectorFilter,
					time: 60_000,
				});
				if (confirm.customId === "delete_confirm") {
					await deleteAllUserData(allDataUser, client, interaction, user, ul);
					await confirm.update({
						content: ul("deleteChar.allSuccess", {
							user: mention,
							components: [],
							embeds: [],
						}),
					});
				} else {
					await confirm.update({
						content: ul("common.cancelled"),
						components: [],
						embeds: [],
					});
				}
			} catch (e) {
				logger.warn(e, "Timeout");
				await interaction.editReply({
					content: ul("common.cancelled"),
					components: [],
					embeds: [],
				});
			}
			return;
		}
		if (!charData) {
			let userName = `<@${user?.id ?? interaction.user.id}>`;
			if (charName) userName += ` (${charName})`;
			await reply(interaction, {
				embeds: [embedError(ul("error.userNotRegistered", { user: userName }), ul)],
			});
			return;
		}
		charName = charName.includes(ul("common.default").toLowerCase())
			? undefined
			: charName;
		const userData = charData[user?.id ?? interaction.user.id];
		const sheetLocation: PersonnageIds = {
			channelId: userData.messageId[1],
			messageId: userData.messageId[0],
		};
		const userChannel: DiscordChannel | undefined = Array.isArray(userData.messageId)
			? await searchUserChannel(client.settings, interaction, ul, sheetLocation.channelId)
			: undefined;
		const msg = `${mention}${charName ? ` *(${charName.capitalize()})*` : ""}`;
		const deleteMsg = ul("deleteChar.allOne", {
			user: `${mention}${charName ? ` *(__${ul("common.character")}__${ul("common.space")}: ${charName.capitalize()})*` : ""}`,
		});
		const rep = await confirmToDelete(
			interaction,
			ul,
			user ?? interaction.user,
			deleteMsg
		);
		const collectorFilter = (i: { user: { id: string | undefined } }) =>
			i.user.id === (user?.id ?? interaction.user.id);
		try {
			const confirm = await rep.awaitMessageComponent({
				filter: collectorFilter,
				time: 60_000,
			});
			if (confirm?.customId === "delete_confirm") {
				await deleteUserByLocation(
					interaction,
					client,
					ul,
					guildData,
					user,
					charName,
					sheetLocation,
					userChannel,
					msg
				);
				await confirm.update({
					content: ul("deleteChar.success", { user: msg }),
					components: [],
					embeds: [],
				});
			} else {
				await confirm.update({
					content: ul("common.cancelled"),
					components: [],
					embeds: [],
				});
			}
		} catch (e) {
			logger.warn(e, "Timeout");
			await interaction.editReply({
				content: ul("common.cancelled"),
				components: [],
				embeds: [],
			});
		}
	},
};

async function deleteMessages(
	ids: UserMessageId[],
	client: EClient,
	interaction: Djs.CommandInteraction,
	ul: Translation
) {
	for (const id of ids) {
		const userThread = await searchUserChannel(client.settings, interaction, ul, id[1]);
		if (!userThread) continue;
		try {
			const message = await userThread.messages.fetch(id[1]);
			await message.delete();
		} catch (e) {
			logger.warn(e, "deleteChar: no message found - No problem");
		}
	}
}

async function deleteAllUserData(
	allDataUser: {
		charName?: string | null;
		messageId: UserMessageId;
		damageName?: string[];
		isPrivate?: boolean;
	}[],
	client: EClient,
	interaction: Djs.CommandInteraction,
	user: Djs.User | null,
	ul: Translation
) {
	//list of all IDs of the messages to delete
	const idToDelete: UserMessageId[] = Object.values(allDataUser).map(
		(data) => data.messageId
	);

	await deleteMessages(idToDelete, client, interaction, ul);

	client.settings.delete(
		interaction.guild!.id,
		`user.${user?.id ?? interaction.user.id}`
	);
	await reply(
		interaction,
		ul("deleteChar.allSuccess", {
			user: Djs.userMention(user?.id ?? interaction.user.id),
		})
	);
	return;
}

async function deleteNoUserMessage(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	guildData: GuildData,
	user: Djs.User | null,
	charName: string | undefined
) {
	const newGuildData = deleteUser(interaction, guildData, user, charName);
	client.settings.set(interaction.guildId as string, newGuildData);
	await reply(
		interaction,
		ul("deleteChar.success", {
			user: Djs.userMention(user?.id ?? interaction.user.id),
		})
	);
}

async function deleteOneChar(
	userChannel:
		| Djs.PrivateThreadChannel
		| Djs.PublicThreadChannel<boolean>
		| Djs.TextChannel
		| Djs.NewsChannel,
	messageID: string,
	interaction: Djs.CommandInteraction,
	client: EClient,
	guildData: GuildData,
	user: Djs.User | null,
	charName: string | undefined,
	ul: Translation,
	msg: string
) {
	try {
		//search for the message and delete it
		const message = await userChannel.messages.fetch(messageID);
		await message.delete();
		const newGuildData = deleteUser(interaction, guildData, user, charName);

		await reply(interaction, ul("deleteChar.success", { user: msg }));
		client.settings.set(interaction.guildId as string, newGuildData);
	} catch (e) {
		logger.warn(e, "deleteChar: no message found - No problem");
		//no message found, delete the character from the database
		const newGuildData = deleteUser(interaction, guildData, user, charName);
		client.settings.set(interaction.guildId as string, newGuildData);
		await reply(interaction, ul("deleteChar.success", { user: msg }));
	}
}

async function confirmToDelete(
	interaction: Djs.CommandInteraction,
	ul: Translation,
	user: Djs.User,
	msg?: string
) {
	const embed = new Djs.EmbedBuilder()
		.setTitle(ul("deleteChar.confirm.title"))
		.setDescription(msg ?? ul("deleteChar.confirm.all", { user }))
		.setColor(Djs.Colors.Red);
	const confirm = new Djs.ButtonBuilder()
		.setCustomId("delete_confirm")
		.setStyle(Djs.ButtonStyle.Danger)
		.setLabel(ul("common.confirm"));
	const cancel = new Djs.ButtonBuilder()
		.setCustomId("delete_cancel")
		.setStyle(Djs.ButtonStyle.Secondary)
		.setLabel(ul("common.cancel"));
	const row = new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(
		confirm,
		cancel
	);
	return await reply(interaction, { embeds: [embed], components: [row] });
}

async function deleteUserByLocation(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	guildData: GuildData,
	user: Djs.User | null,
	charName: string | undefined,
	sheetLocation: PersonnageIds,
	userChannel: DiscordChannel | undefined,
	msg: string
) {
	if (!userChannel) {
		return await deleteNoUserMessage(interaction, client, ul, guildData, user, charName);
	}
	const messageID = sheetLocation.messageId;
	return await deleteOneChar(
		userChannel,
		messageID,
		interaction,
		client,
		guildData,
		user,
		charName,
		ul,
		msg
	);
}
