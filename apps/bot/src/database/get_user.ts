import type { EClient } from "@dicelette/client";
import type { StatisticalTemplate } from "@dicelette/core";
import {
	fetchChannel,
	getGuildContext,
	getInteractionContext as getLangAndConfig,
	haveAccess,
} from "@dicelette/helpers";
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
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	cleanAvatarUrl,
	logger,
	uniformizeRecords,
} from "@dicelette/utils";
import {
	getCharaInMemory,
	getTemplateByInteraction,
	mergeAttribute,
	mergeDisplayStats,
	updateMemory,
} from "database";
import type { EmbedBuilder, Message } from "discord.js";
import * as Djs from "discord.js";
import equal from "fast-deep-equal";
import { embedError, ensureEmbed, getEmbeds, reply, replyEphemeralError } from "messages";
import { isSerializedNameEquals, searchUserChannel } from "utils";

type GetOptions = {
	integrateCombinaison: boolean;
	allowAccess: boolean;
	skipNotFound: boolean;
	fetchAvatar: boolean;
	fetchChannel: boolean;
	fetchMessage: boolean;
	guildId: string;
	cleanUrl: boolean;
	attributes: boolean;
};

export function getUserByEmbed(
	data: { message?: Message; embeds?: EmbedBuilder[] },
	first: boolean | undefined = false,
	integrateCombinaison = true,
	fetchAvatar = false,
	fetchChannel = false,
	cleanUrl = true,
	standardize = true
) {
	const { message, embeds } = data;
	const user: Partial<UserData> = {};
	const userEmbed = first ? ensureEmbed(message) : getEmbeds(message, "user", embeds);
	if (!userEmbed) return;
	const parsedFields = parseEmbedFields(userEmbed.data as Djs.Embed);
	const charNameFields = [
		{ key: "common.charName", value: parsedFields?.["common.charName"] },
		{ key: "common.character", value: parsedFields?.["common.character"] },
	].find((field) => field.value !== undefined);
	if (charNameFields && charNameFields.value !== "common.noSet") {
		user.userName = charNameFields.value;
	}
	const statsFields = getEmbeds(message, "stats", embeds)?.data as Djs.Embed;
	const stats = parseEmbedFields(statsFields);
	const displayStats = Object.keys(stats);
	if (displayStats.length > 0) user.displayStats = displayStats;
	user.stats = parseEmbedToStats(stats, integrateCombinaison);
	const damageFields = getEmbeds(message, "damage", embeds)?.data as Djs.Embed;
	const templateDamage = parseDamageFields(damageFields, standardize);
	const templateEmbed = first ? userEmbed : getEmbeds(message, "template", embeds);
	user.damage = templateDamage;
	user.template = parseTemplateField(parseEmbedFields(templateEmbed?.data as Djs.Embed));
	if (fetchAvatar) user.avatar = userEmbed.data.thumbnail?.url || undefined;

	if (user.avatar && cleanUrl) user.avatar = cleanAvatarUrl(user.avatar);
	if (fetchChannel && message) user.channel = message.channel.id;
	return user as UserData;
}

export async function firstCharName(client: EClient, guildId: string, userId: string) {
	const userData = client.settings.get(guildId, `user.${userId}`);
	if (!userData) return;
	return userData[0] ?? undefined;
}

export async function getCharFromText(
	client: EClient,
	guildId: string,
	userId: string,
	dice: string
) {
	const regex = / @([\p{L}\p{M}]+)\]?$/u;
	const match = dice.match(regex);
	if (!match)
		return (await firstCharName(client, guildId, userId))?.charName ?? undefined;
	return match[1].standardize() ?? undefined;
}

/** Gets the first registered character and stats for the interacting user; `undefined` if none and `skipNotFound` is true. */
export async function getFirstChar(
	client: EClient,
	interaction: Djs.CommandInteraction,
	ul: Translation,
	skipNotFound = false
) {
	const firstChar = await firstCharName(
		client,
		interaction.guild!.id,
		interaction.user.id
	);
	if (!firstChar) {
		if (skipNotFound) return;
		await reply(interaction, {
			embeds: [embedError(ul("error.user.youRegistered"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const optionChar = firstChar.charName?.capitalize();
	const userStatistique = await getUserFromInteraction(
		client,
		interaction.user.id,
		interaction,
		firstChar.charName
	);

	return { optionChar, userStatistique };
}

export async function getCharacterMessage(
	messageId: UserMessageId,
	guild: Djs.Guild,
	client: EClient
): Promise<Message | undefined> {
	const sheetLocation: PersonnageIds = {
		channelId: messageId[1],
		messageId: messageId[0],
	};
	let channel = client.channels.cache.get(sheetLocation.channelId);
	if (channel instanceof Djs.CategoryChannel) return;

	if (!channel) {
		const fetchedChannel = await fetchChannel(guild, sheetLocation.channelId);
		if (
			!fetchedChannel ||
			fetchedChannel instanceof Djs.CategoryChannel ||
			fetchedChannel instanceof Djs.ForumChannel ||
			fetchedChannel instanceof Djs.MediaChannel
		)
			return;

		channel = fetchedChannel;
	}
	try {
		if ("messages" in channel) {
			const message = await channel.messages.fetch(sheetLocation.messageId);
			if (!message) {
				logger.warn(`Message ${sheetLocation.messageId} not found`);
				return;
			}
			return message;
		}
	} catch (_e) {
		return;
	}
}

export async function getUser(
	messageId: UserMessageId,
	guild: Djs.Guild,
	client: EClient,
	options?: {
		integrateCombinaison?: boolean;
		fetchAvatar?: boolean;
		fetchChannel?: boolean;
		cleanUrl?: boolean;
		standardize?: boolean;
	}
) {
	const message = await getCharacterMessage(messageId, guild, client);
	if (!message) return;

	return getUserByEmbed(
		{ message },
		false,
		options?.integrateCombinaison ?? true,
		options?.fetchAvatar ?? false,
		options?.fetchChannel ?? false,
		options?.cleanUrl ?? true,
		options?.standardize ?? true
	);
}

export async function getUserFrom(
	client: EClient,
	userId: string,
	charName: string | null | undefined,
	context:
		| { type: "interaction"; interaction: Djs.BaseInteraction }
		| { type: "message"; message: Djs.Message },
	options?: Partial<GetOptions>
): Promise<{ userData?: UserData; charName?: string } | undefined> {
	const botErrorOptions: BotErrorOptions = {
		cause: "USER_FETCH",
		level: BotErrorLevel.Warning,
	};
	const guildId =
		options?.guildId ??
		(context.type === "interaction"
			? context.interaction.guild!.id
			: context.message.guild!.id);
	const guildData = client.settings;
	const characters = client.characters;

	const getChara = getCharaInMemory(characters, userId, guildId, charName);
	if (
		getChara &&
		!options?.fetchAvatar &&
		!options?.fetchChannel &&
		!options?.fetchMessage
	) {
		if (options?.attributes) {
			// Keep cache entry immutable here; return an enriched copy for this request only.
			const userData: UserData = {
				...getChara,
				stats: mergeAttribute(client, getChara, guildId, userId),
			};
			userData.displayStats = mergeDisplayStats(client, userData, guildId, userId);
			return { charName: charName?.capitalize(), userData };
		}
		return { charName: charName?.capitalize(), userData: getChara };
	}

	if (!options)
		options = {
			allowAccess: true,
			integrateCombinaison: true,
			skipNotFound: false,
		};
	const { integrateCombinaison, allowAccess, skipNotFound } = options;

	const ul = ln(
		guildData.get(guildId, "lang") ??
			(context.type === "interaction"
				? (context.interaction.locale as Djs.Locale)
				: context.message.guild!.preferredLocale)
	);

	const user = guildData.get(guildId, `user.${userId}`)?.find((char) => {
		return char.charName?.subText(charName) || (!charName && char.charName == null);
	});

	if (!user) {
		if (options?.attributes) {
			const stats = mergeAttribute(client, undefined, guildId, userId);
			if (stats) {
				const userData: UserData = { stats, template: {} };
				userData.displayStats = mergeDisplayStats(client, userData, guildId, userId);
				return { userData };
			}
		}
		return;
	}

	const userMessageId: PersonnageIds = {
		channelId: user.messageId[1],
		messageId: user.messageId[0],
	};

	// Get channel/thread and access check following the context
	let targetMessage: Djs.Message | undefined;
	if (context.type === "interaction") {
		const thread = await searchUserChannel(
			guildData,
			context.interaction,
			ul,
			userMessageId.channelId,
			undefined,
			skipNotFound
		);
		if (!thread) {
			if (skipNotFound) return;
			throw new BotError(ul("error.channel.thread"), botErrorOptions);
		}
		if (
			user.isPrivate &&
			!allowAccess &&
			!(await haveAccess(context.interaction, thread.id, userId))
		)
			throw new BotError(ul("error.private"), botErrorOptions);

		targetMessage = await thread.messages.fetch(userMessageId.messageId);
	} else {
		let channel = client.channels.cache.get(userMessageId.channelId);
		if (!channel && context.message.guild) {
			const fetchedChannel = await fetchChannel(
				context.message.guild,
				userMessageId.channelId
			);
			if (fetchedChannel) channel = fetchedChannel;
		}

		if (!channel || !("messages" in channel)) {
			if (!skipNotFound) throw new BotError(ul("error.channel.thread"), botErrorOptions);
			return;
		}

		if (
			user.isPrivate &&
			!allowAccess &&
			!(
				context.message.author.id === userId ||
				context.message.member?.permissions.has(Djs.PermissionFlagsBits.Administrator)
			)
		)
			throw new BotError(ul("error.private"), botErrorOptions);

		targetMessage = await channel.messages.fetch(userMessageId.messageId);
	}

	try {
		const userData = getUserByEmbed(
			{ message: targetMessage },
			undefined,
			integrateCombinaison,
			options.fetchAvatar,
			options.fetchChannel,
			options.cleanUrl
		);
		if (!userData) throw new BotError(ul("error.user.notFound.generic"), botErrorOptions);
		await updateMemory(
			characters,
			guildId,
			userId,
			ul,
			{
				userData,
			},
			client.characterCacheTimestamps
		);
		if (options.fetchMessage) userData.messageId = targetMessage.id;

		if (options?.attributes) {
			userData.stats = mergeAttribute(client, userData, guildId, userId);
			userData.displayStats = mergeDisplayStats(client, userData, guildId, userId);
			logger.trace("User stats", userData.stats, "User display", userData.displayStats);
		}

		return { charName: user.charName?.capitalize(), userData };
	} catch (error) {
		if (skipNotFound) return;
		logger.warn(error as Error);
		throw new BotError(ul("error.user.notFound.generic"), botErrorOptions);
	}
}

/** Gets a user's character data from a Discord message: in-memory cache first, then the character thread if needed. */
export async function getUserFromMessage(
	client: EClient,
	userId: string,
	message: Djs.Message,
	charName?: string | null,
	options?: Partial<GetOptions>
): Promise<{ userData?: UserData; charName?: string } | undefined> {
	return getUserFrom(client, userId, charName, { message, type: "message" }, options);
}

/** Gets a user's character data from an interaction: in-memory cache first, then the character thread, with private-character access checks. */
export async function getUserFromInteraction(
	client: EClient,
	userId: string,
	interaction: Djs.BaseInteraction,
	charName?: string | null,
	options?: Partial<GetOptions>
): Promise<{ userData?: UserData; charName?: string } | undefined> {
	return getUserFrom(
		client,
		userId,
		charName,
		{ interaction, type: "interaction" },
		options
	);
}

/** Maps user IDs to character data from interaction options; if a character name is given without a user, searches all users for a match. */
export async function getRecordChar(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	t: Translation,
	strict = true
): Promise<Record<string, UserGuildData> | undefined> {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const guildData = client.settings.get(interaction.guildId as string);
	const ul = ln(interaction.locale);
	if (!guildData) {
		await reply(interaction, {
			embeds: [
				embedError(
					ul("error.template.notFound", {
						guildId: interaction.guild?.name ?? interaction.guild?.id ?? "unknow guild",
					}),
					ul
				),
			],
		});
		return undefined;
	}
	const user = options.getUser(t("display.userLowercase"));
	let charName = options.getString(t("common.character"))?.toLowerCase();
	if (charName && findln(charName) === "common.default") charName = undefined;

	if (!user && charName) {
		const allUsersData = guildData.user ?? {};
		const found = Object.entries(allUsersData).find(([, chars]) => {
			return chars.some((char) => char.charName?.subText(charName, strict));
		});
		if (found?.[1]) {
			const [userId, chars] = found;
			const userChar = chars.find((char) => char.charName?.subText(charName, strict));
			if (userChar) {
				return { [userId]: userChar };
			}
		}
	}
	const userData = client.settings.get(
		interaction.guild!.id,
		`user.${user?.id ?? interaction.user.id}`
	);
	const findChara = charName
		? userData?.find((char) => char.charName?.subText(charName, strict))
		: undefined;
	if (!findChara && charName) return undefined;

	if (!findChara) {
		const char = userData?.[0];
		return char ? { [user?.id ?? interaction.user.id]: char } : undefined;
	}
	return {
		[user?.id ?? interaction.user.id]: findChara,
	};
}

export function findChara(charData: CharDataWithName, charName?: string) {
	const res = Object.entries(charData).find(([id, data]) => {
		data.userId = id;
		if (data.charName && charName) return data.charName.subText(charName);
		return data.charName === charName;
	});
	if (!res) return undefined;
	return res[1];
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
		coord: ids,
		isInDb: message.channel.id === ids.channelId && message.id === ids.messageId,
	};
}

/** Extracts the user ID, character name, and channel from an embed in a button/modal interaction. */
export async function getUserNameAndChar(
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
	ul: Translation,
	first?: boolean
) {
	const botErrorOptions: BotErrorOptions = {
		cause: "USER_EXTRACT",
		level: BotErrorLevel.Warning,
	};
	let userEmbed = getEmbeds(interaction?.message ?? undefined, "user");
	if (first) {
		const firstEmbed = ensureEmbed(interaction?.message ?? undefined);
		if (firstEmbed) userEmbed = new Djs.EmbedBuilder(firstEmbed.data);
	}
	if (!userEmbed) throw new BotError(ul("error.embed.notFound"), botErrorOptions);
	const userID = userEmbed.data.fields
		?.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	if (!userID) throw new BotError(ul("error.user.notFound.generic"), botErrorOptions);
	if (
		!interaction.channel ||
		(!(interaction.channel instanceof Djs.ThreadChannel) &&
			!(interaction.channel instanceof Djs.TextChannel))
	)
		throw new BotError(ul("error.channel.thread"), botErrorOptions);
	let userName = userEmbed.data.fields?.find(
		(field) => findln(field.name) === "common.character"
	)?.value;
	if (userName === ul("common.noSet")) userName = undefined;
	return { thread: interaction.channel, userID, userName };
}

export async function getMacro(
	client: EClient,
	ul: Translation,
	interaction: Djs.ChatInputCommandInteraction,
	skipNotFound?: boolean,
	user?: Djs.User
) {
	const db = client.settings.get(interaction.guild!.id);
	if (!db || !interaction.guild || !interaction.channel) return;
	let charOptions = interaction.options.getString(t("common.character")) ?? undefined;
	const charName = charOptions?.normalize();
	if (!user) user = interaction.user;
	let userStatistique = (
		await getUserFromInteraction(client, user.id, interaction, charName, {
			skipNotFound,
		})
	)?.userData;
	const selectedCharByQueries = isSerializedNameEquals(userStatistique, charName);
	if (charOptions && !selectedCharByQueries) {
		const text = ul("error.user.charName", { charName: charOptions.capitalize() });
		await replyEphemeralError(interaction, text, ul);
		return;
	}
	charOptions = userStatistique?.userName ?? undefined;
	if (!userStatistique && !charName) {
		const char = await getFirstChar(client, interaction, ul, true);
		userStatistique = char?.userStatistique?.userData;
		charOptions = char?.optionChar ?? undefined;
	}
	if (!db.templateID?.damageName) {
		if (!userStatistique) {
			await replyEphemeralError(interaction, ul("error.user.youRegistered"), ul);
			return;
		}
		if (!userStatistique.damage) {
			await replyEphemeralError(interaction, ul("error.damage.empty"), ul);
			return;
		}
	} else if (!userStatistique?.damage) {
		// Falls back to the global template's damage names when the user has none of their own.
		const template = await getTemplateByInteraction(interaction, client);

		const damage = template?.damage
			? (uniformizeRecords(template.damage) as Record<string, string>)
			: undefined;
		logger.trace("The template use:", damage);

		userStatistique = {
			damage,
			isFromTemplate: true,
			template: {
				critical: template?.critical,
				customCritical: template?.customCritical,
				diceType: template?.diceType,
			},
			userName: charName,
		};
	}
	userStatistique.stats = mergeAttribute(
		client,
		userStatistique,
		interaction.guild!.id,
		user.id
	);
	userStatistique.displayStats = mergeDisplayStats(
		client,
		userStatistique,
		interaction.guild!.id,
		user.id
	);
	return { optionChar: charOptions, userStatistique };
}

/** Gets user statistics for a command interaction, falling back to the first registered character or a minimal template if needed. */
export async function getStatistics(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	skipNotFound = false,
	user?: Djs.User
) {
	if (!interaction.guild || !interaction.channel) return undefined;
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const { ul, config: guildData } = getLangAndConfig(client, interaction);
	if (!guildData) return;

	const targetUserId = user?.id ?? interaction.user.id;
	let optionChar = options.getString(t("common.character")) ?? undefined;
	if (optionChar && findln(optionChar) === "common.default") optionChar = undefined;
	const charName = optionChar?.standardize();

	let userStatistique = (
		await getUserFromInteraction(client, targetUserId, interaction, charName, {
			skipNotFound: true,
		})
	)?.userData;
	const selectedCharByQueries = isSerializedNameEquals(userStatistique, charName);

	if (optionChar && !selectedCharByQueries) {
		await reply(interaction, {
			embeds: [
				embedError(ul("error.user.charName", { charName: optionChar.capitalize() }), ul),
			],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const originalOptionChar = optionChar;
	optionChar = userStatistique?.userName ? userStatistique.userName : undefined;
	const template = await getTemplateByInteraction(interaction, client, skipNotFound);
	const diceType = !userStatistique
		? template?.diceType
		: userStatistique.template.diceType;
	const needStats = diceType?.includes("$");
	if (!userStatistique && !charName) {
		const char = await getFirstChar(client, interaction, ul, skipNotFound);
		userStatistique = char?.userStatistique?.userData;
		optionChar = char?.optionChar;
	}

	function generateMinimalTemplate(template: StatisticalTemplate) {
		const tempDamage = template.damage
			? (uniformizeRecords(template.damage) as Record<string, string>)
			: undefined;
		const optionChar = originalOptionChar;
		return {
			res: {
				damage: tempDamage,
				isFromTemplate: true,
				template: {
					critical: template?.critical,
					customCritical: template?.customCritical,
					diceType: template?.diceType,
				},
			},
			optionChar,
		};
	}

	if (!needStats && !userStatistique && template) {
		const minTemp = generateMinimalTemplate(template);
		userStatistique = minTemp.res;
		optionChar = minTemp.optionChar;
	}
	if (!userStatistique && !skipNotFound) {
		await reply(interaction, {
			embeds: [embedError(ul("error.user.youRegistered"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	if (!userStatistique?.stats && !template?.statistics && needStats) {
		await reply(interaction, {
			embeds: [embedError(ul("error.stats.notFound_plural"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	// If we have a template from guild/settings and the user's template is either empty or differs,
	// update the in-memory user data so it stays in sync with current template configuration.
	if (userStatistique && template && !equal(userStatistique.template, template)) {
		logger.trace("Updating user template to match guild template settings.");
		userStatistique.template = template;
		await updateMemory(
			client.characters,
			interaction.guild!.id,
			targetUserId,
			ul,
			{
				userData: userStatistique,
			},
			client.characterCacheTimestamps
		);
	}

	if (!userStatistique) {
		if (template) {
			const res = generateMinimalTemplate(template);
			userStatistique = res.res;
			optionChar = res.optionChar;
		} else {
			userStatistique = {
				isFromTemplate: false,
				stats: {},
				template: {},
			};
		}
	}
	userStatistique.stats = mergeAttribute(
		client,
		userStatistique,
		interaction.guild!.id,
		targetUserId
	);
	userStatistique.displayStats = mergeDisplayStats(
		client,
		userStatistique,
		interaction.guild!.id,
		targetUserId
	);

	return { optionChar, options, ul, userStatistique };
}

/** Gets a statistic's value from user data, resolving alternative names from the guild's template if the given name isn't found. */
export function getRightValue(
	userStatistique: UserData,
	standardizedStatistic: string,
	ul: Translation,
	client: EClient,
	guild: Djs.Guild,
	optionChar: string | undefined,
	statistic: string
) {
	const botErrorOptions: BotErrorOptions = {
		cause: "STAT_FETCH",
		level: BotErrorLevel.Warning,
	};
	let userStat = userStatistique.stats?.[standardizedStatistic];
	// noinspection LoopStatementThatDoesntLoopJS
	while (!userStat) {
		const ctx = getGuildContext(client, guild.id);
		const guildData = ctx?.templateID?.statsName;
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
		if (userStatistique.isFromTemplate) {
			if (!optionChar)
				throw new BotError(
					ul("error.stats.user", {
						stat: standardizedStatistic,
					}),
					botErrorOptions
				);
			throw new BotError(
				ul("error.stats.char", {
					char: optionChar.capitalize(),
					stat: standardizedStatistic,
				}),
				botErrorOptions
			);
		}
		throw new BotError(
			ul("error.stats.notFound_singular", {
				char: optionChar ? `${optionChar.capitalize()}` : "",
				stat: standardizedStatistic,
			}),
			botErrorOptions
		);
	}
	return { standardizedStatistic, statistic, userStat };
}
