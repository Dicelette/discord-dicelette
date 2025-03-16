import { findln, ln, t } from "@dicelette/localization";
import {
	parseDamageFields,
	parseEmbedFields,
	parseEmbedToStats,
	parseTemplateField,
} from "@dicelette/parse_result";
import type {
	CharDataWithName,
	PersonnageIds,
	Settings,
	Translation,
	UserData,
	UserGuildData,
	UserMessageId,
} from "@dicelette/types";
import { cleanAvatarUrl, logger } from "@dicelette/utils";
import type { EClient } from "client";
import { getCharaInMemory, updateMemory } from "database";
import * as Djs from "discord.js";
import { embedError, ensureEmbed, getEmbeds, reply } from "messages";
import { getLangAndConfig, haveAccess, searchUserChannel, serializeName } from "utils";

export function getUserByEmbed(
	data: {
		message?: Djs.Message<boolean>;
		embeds?: Djs.EmbedBuilder[];
	},
	ul: Translation,
	first: boolean | undefined = false,
	integrateCombinaison = true,
	fetchAvatar = false,
	fetchChannel = false
) {
	const { message, embeds } = data;
	const user: Partial<UserData> = {};
	const userEmbed = first ? ensureEmbed(message) : getEmbeds(ul, message, "user", embeds);
	if (!userEmbed) return;
	const parsedFields = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
	const charNameFields = [
		{ key: "common.charName", value: parsedFields?.["common.charName"] },
		{ key: "common.character", value: parsedFields?.["common.character"] },
	].find((field) => field.value !== undefined);
	if (charNameFields && charNameFields.value !== "common.noSet") {
		user.userName = charNameFields.value;
	}
	const statsFields = getEmbeds(ul, message, "stats", embeds)?.toJSON() as Djs.Embed;
	user.stats = parseEmbedToStats(parseEmbedFields(statsFields), integrateCombinaison);
	const damageFields = getEmbeds(ul, message, "damage", embeds)?.toJSON() as Djs.Embed;
	const templateDamage = parseDamageFields(damageFields);
	const templateEmbed = first ? userEmbed : getEmbeds(ul, message, "template", embeds);
	user.damage = templateDamage;
	user.template = parseTemplateField(
		parseEmbedFields(templateEmbed?.toJSON() as Djs.Embed)
	);
	if (fetchAvatar) user.avatar = userEmbed.toJSON().thumbnail?.url || undefined;
	if (user.avatar) user.avatar = cleanAvatarUrl(user.avatar);
	if (fetchChannel && message) user.channel = message.channel.id;
	return user as UserData;
}

export async function getFirstChar(
	client: EClient,
	interaction: Djs.CommandInteraction,
	ul: Translation
) {
	const userData = client.settings.get(
		interaction.guild!.id,
		`user.${interaction.user.id}`
	);
	if (!userData) {
		await reply(interaction, {
			embeds: [embedError(ul("error.notRegistered"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const firstChar = userData[0];
	const optionChar = firstChar.charName?.capitalize();
	const userStatistique = await getUserFromMessage(
		client,
		interaction.user.id,
		interaction,
		firstChar.charName
	);

	return { optionChar, userStatistique };
}

export async function getUser(
	messageId: UserMessageId,
	guild: Djs.Guild,
	client: EClient
) {
	const sheetLocation: PersonnageIds = {
		channelId: messageId[1],
		messageId: messageId[0],
	};
	let channel = client.channels.cache.get(sheetLocation.channelId);
	if (channel instanceof Djs.CategoryChannel) return;

	if (!channel) {
		//get the channel from the guild
		const fetchChannel = await guild.channels.fetch(sheetLocation.channelId);
		// noinspection SuspiciousTypeOfGuard
		if (
			!fetchChannel ||
			fetchChannel instanceof Djs.CategoryChannel ||
			fetchChannel instanceof Djs.ForumChannel ||
			fetchChannel instanceof Djs.MediaChannel
		)
			return;

		channel = fetchChannel;
	}
	try {
		if ("messages" in channel) {
			const message = await channel.messages.fetch(sheetLocation.messageId);
			if (!message) {
				logger.warn(`Message ${sheetLocation.messageId} not found`);
				return;
			}
			const ul = ln(client.settings.get(guild.id, "lang") ?? guild.preferredLocale);
			return getUserByEmbed({ message }, ul);
		}
	} catch (_e) {
		return;
	}
}

/**
 * Create the UserData starting from the guildData and using a userId
 */
export async function getUserFromMessage(
	client: EClient,
	userId: string,
	interaction: Djs.BaseInteraction,
	charName?: string | null,
	options?: {
		integrateCombinaison?: boolean;
		allowAccess?: boolean;
		skipNotFound?: boolean;
		fetchAvatar?: boolean;
		fetchChannel?: boolean;
	}
) {
	const guildData = client.settings;
	const characters = client.characters;
	const getChara = getCharaInMemory(characters, userId, interaction.guild!.id, charName);
	if (getChara) return getChara;

	if (!options)
		options = { integrateCombinaison: true, allowAccess: true, skipNotFound: false };
	const { integrateCombinaison, allowAccess, skipNotFound } = options;
	const ul = ln(guildData.get(interaction.guild!.id, "lang") ?? interaction.locale);
	const guild = interaction.guild;
	const user = guildData.get(guild!.id, `user.${userId}`)?.find((char) => {
		return char.charName?.subText(charName);
	});
	if (!user) return;
	const userMessageId: PersonnageIds = {
		channelId: user.messageId[1],
		messageId: user.messageId[0],
	};
	const thread = await searchUserChannel(
		guildData,
		interaction,
		ul,
		userMessageId.channelId
	);
	if (!thread) throw new Error(ul("error.noThread"));
	if (user.isPrivate && !allowAccess && !haveAccess(interaction, thread.id, userId)) {
		throw new Error(ul("error.private"));
	}
	try {
		const message = await thread.messages.fetch(userMessageId.messageId);
		const userData = getUserByEmbed(
			{ message },
			ul,
			undefined,
			integrateCombinaison,
			options.fetchAvatar,
			options.fetchChannel
		);
		//set chara in memory
		await updateMemory(characters, guild!.id, userId, ul, {
			userData,
		});
		return userData;
	} catch (error) {
		if (!skipNotFound) throw new Error(ul("error.user"), { cause: "404 not found" });
	}
}

export async function getRecordChar(
	interaction: Djs.CommandInteraction,
	client: EClient,
	t: Translation,
	strict = true
): Promise<Record<string, UserGuildData> | undefined> {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const guildData = client.settings.get(interaction.guildId as string);
	const ul = ln(interaction.locale as Djs.Locale);
	if (!guildData) {
		await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
		return undefined;
	}
	const user = options.getUser(t("display.userLowercase"));
	let charName = options.getString(t("common.character"))?.toLowerCase();
	if (charName?.includes(ul("common.default").toLowerCase())) charName = undefined;

	if (!user && charName) {
		//get the character data in the database
		const allUsersData = guildData.user;
		const allUsers = Object.entries(allUsersData);
		for (const [user, data] of allUsers) {
			const userChar = data.find((char) => {
				return char.charName?.subText(charName, strict);
			});
			if (userChar) {
				return {
					[user as string]: userChar,
				};
			}
		}
	}
	const userData = client.settings.get(
		interaction.guild!.id,
		`user.${user?.id ?? interaction.user.id}`
	);
	const findChara = userData?.find((char) => {
		if (charName) return char.charName?.subText(charName, strict);
	});
	if (!findChara && charName) return undefined;

	if (!findChara) {
		const char = userData?.[0];
		return char ? { [user?.id ?? interaction.user.id]: char } : undefined;
	}
	return {
		[user?.id ?? interaction.user.id]: findChara,
	};
}

export async function findChara(charData: CharDataWithName, charName?: string) {
	return Object.values(charData).find((data) => {
		if (data.charName && charName) return data.charName.subText(charName);

		return data.charName === charName;
	});
}

export function verifyIfEmbedInDB(
	db: Settings,
	message: Djs.Message,
	userId: string,
	userName?: string
): { isInDb: boolean; coord?: PersonnageIds } {
	const charData = db.get(message.guild!.id, `user.${userId}`);
	if (!charData) return { isInDb: false };
	const charName = charData.find((char) => {
		if (userName && char.charName)
			return char.charName.standardize() === userName.standardize();
		return char.charName == null && userName == null;
	});
	if (!charName) return { isInDb: false };
	const ids: PersonnageIds = {
		channelId: charName.messageId[1],
		messageId: charName.messageId[0],
	};
	return {
		isInDb: message.channel.id === ids.channelId && message.id === ids.messageId,
		coord: ids,
	};
}

/**
 * Get the userName and the char from the embed between an interaction (button or modal), throw error if not found
 */
export async function getUserNameAndChar(
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
	ul: Translation,
	first?: boolean
) {
	let userEmbed = getEmbeds(ul, interaction?.message ?? undefined, "user");
	if (first) {
		const firstEmbed = ensureEmbed(interaction?.message ?? undefined);
		if (firstEmbed) userEmbed = new Djs.EmbedBuilder(firstEmbed.toJSON());
	}
	if (!userEmbed) throw new Error(ul("error.noEmbed"));
	const userID = userEmbed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	if (!userID) throw new Error(ul("error.user"));
	if (
		!interaction.channel ||
		(!(interaction.channel instanceof Djs.ThreadChannel) &&
			!(interaction.channel instanceof Djs.TextChannel))
	)
		throw new Error(ul("error.noThread"));
	let userName = userEmbed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.character")?.value;
	if (userName === ul("common.noSet")) userName = undefined;
	return { userID, userName, thread: interaction.channel };
}

export async function getStatistics(
	interaction: Djs.CommandInteraction,
	client: EClient
) {
	if (!interaction.guild || !interaction.channel) return undefined;
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const { ul, config: guildData } = getLangAndConfig(client.settings, interaction);
	if (!guildData) return;
	let optionChar = options.getString(t("common.character")) ?? undefined;
	const charName = optionChar?.standardize();

	let userStatistique = await getUserFromMessage(
		client,
		interaction.user.id,
		interaction,
		charName,
		{ skipNotFound: true }
	);
	const selectedCharByQueries = serializeName(userStatistique, charName);

	if (optionChar && !selectedCharByQueries) {
		await reply(interaction, {
			embeds: [
				embedError(ul("error.charName", { charName: optionChar.capitalize() }), ul),
			],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	optionChar = userStatistique?.userName ? userStatistique.userName : undefined;
	if (!userStatistique && !charName) {
		//find the first character registered
		const char = await getFirstChar(client, interaction, ul);
		userStatistique = char?.userStatistique;
		optionChar = char?.optionChar;
	}
	if (!userStatistique) {
		await reply(interaction, {
			embeds: [embedError(ul("error.notRegistered"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	if (!userStatistique.stats) {
		await reply(interaction, {
			embeds: [embedError(ul("error.noStats"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	return { userStatistique, ul, optionChar, options };
}

export function getRightValue(
	userStatistique: UserData,
	standardizedStatistic: string,
	ul: Translation,
	client: EClient,
	interaction: Djs.CommandInteraction,
	optionChar: string | undefined,
	statistic: string
) {
	let userStat = userStatistique.stats?.[standardizedStatistic];
	// noinspection LoopStatementThatDoesntLoopJS
	while (!userStat) {
		const guildData = client.settings.get(interaction.guild!.id, "templateID.statsName");
		if (userStatistique.stats && guildData) {
			const findStatInList = guildData.find((stat) =>
				stat.subText(standardizedStatistic)
			);
			if (findStatInList) {
				standardizedStatistic = findStatInList.standardize(true);
				statistic = findStatInList;
				userStat = userStatistique.stats[findStatInList.standardize(true)];
			}
		}
		if (userStat) break;
		throw new Error(
			ul("error.noStat", {
				stat: standardizedStatistic.capitalize(),
				char: optionChar ? ` ${optionChar.capitalize()}` : "",
			})
		);
	}
	return { userStat, standardizedStatistic, statistic };
}
