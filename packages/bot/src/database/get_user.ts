import {
	fetchChannel,
	getGuildContext,
	getInteractionContext as getLangAndConfig,
	haveAccess,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
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
} from "@dicelette/utils";
import { getCharaInMemory, getTemplateByInteraction, updateMemory } from "database";
import type { EmbedBuilder, Message } from "discord.js";
import * as Djs from "discord.js";
import equal from "fast-deep-equal";
import { embedError, ensureEmbed, getEmbeds, reply } from "messages";
import { isSerializedNameEquals, searchUserChannel } from "utils";

export function getUserByEmbed(
	data: { message?: Message; embeds?: EmbedBuilder[] },
	first: boolean | undefined = false,
	integrateCombinaison = true,
	fetchAvatar = false,
	fetchChannel = false,
	cleanUrl = true
) {
	const { message, embeds } = data;
	const user: Partial<UserData> = {};
	const userEmbed = first ? ensureEmbed(message) : getEmbeds(message, "user", embeds);
	if (!userEmbed) return;
	const parsedFields = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
	const charNameFields = [
		{ key: "common.charName", value: parsedFields?.["common.charName"] },
		{ key: "common.character", value: parsedFields?.["common.character"] },
	].find((field) => field.value !== undefined);
	if (charNameFields && charNameFields.value !== "common.noSet") {
		user.userName = charNameFields.value;
	}
	const statsFields = getEmbeds(message, "stats", embeds)?.toJSON() as Djs.Embed;
	user.stats = parseEmbedToStats(parseEmbedFields(statsFields), integrateCombinaison);
	const damageFields = getEmbeds(message, "damage", embeds)?.toJSON() as Djs.Embed;
	const templateDamage = parseDamageFields(damageFields);
	const templateEmbed = first ? userEmbed : getEmbeds(message, "template", embeds);
	user.damage = templateDamage;
	user.template = parseTemplateField(
		parseEmbedFields(templateEmbed?.toJSON() as Djs.Embed)
	);
	if (fetchAvatar) user.avatar = userEmbed.toJSON().thumbnail?.url || undefined;

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

/**
 * Retrieves the first registered character and associated statistics for the user invoking the interaction.
 *
 * If no user data is found and {@link skipNotFound} is false, replies to the interaction with an error embed.
 *
 * @param {EClient} client
 * @param {Djs.CommandInteraction} interaction
 * @param {Translation} ul
 * @param skipNotFound - If true, suppresses error replies and returns early when no user data is found.
 * @returns An object containing the capitalized character name and user statistics, or `undefined` if not found and {@link skipNotFound} is true.
 */
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
		const fetchedChannel = await fetchChannel(guild, sheetLocation.channelId);
		// noinspection SuspiciousTypeOfGuard
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
			return getUserByEmbed({ message });
		}
	} catch (_e) {
		//logger.warn(_e);
		return;
	}
}

// Fonction interne factorisée pour extraire la logique commune aux deux variantes
async function getUserFrom(
	client: EClient,
	userId: string,
	charName: string | null | undefined,
	context:
		| { type: "interaction"; interaction: Djs.BaseInteraction }
		| { type: "message"; message: Djs.Message },
	options?: {
		integrateCombinaison?: boolean;
		allowAccess?: boolean;
		skipNotFound?: boolean;
		fetchAvatar?: boolean;
		fetchChannel?: boolean;
		fetchMessage?: boolean;
		guildId?: string;
		cleanUrl?: boolean;
	}
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
	)
		return { charName: charName?.capitalize(), userData: getChara };

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

	if (!user) return;

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
		// contexte message
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
		await updateMemory(characters, guildId, userId, ul, {
			userData,
		});
		if (options.fetchMessage) userData!.messageId = targetMessage!.id;

		return { charName: user.charName?.capitalize(), userData };
	} catch (error) {
		if (skipNotFound) return;
		logger.warn(error);
		throw new BotError(ul("error.user.notFound"), botErrorOptions);
	}
}

/**
 * Retrieves a user's character data from a Discord message directly.
 *
 * This is a simplified version of getUserFromInteractiongetUserFromInteraction that works with a Discord message instead of an interaction.
 * Searches in-memory cache first, then fetches the relevant message from the user's character thread if necessary.
 *
 * @param {EClient} client
 * @param {string} userId - The Discord user ID whose character data is being retrieved.
 * @param {Djs.Message} message - The Discord message context.
 * @param {string|null|undefined} charName - The character name to search for, if applicable.
 * @param options - Optional settings to control data integration, access checks, error handling, and additional data fetching.
 * @returns The user's character data, or `undefined` if not found and `skipNotFound` is enabled.
 *
 * @throws {Error} If the user's character thread is missing, access is denied to a private character, or the user is not found (unless `skipNotFound` is true).
 */
export async function getUserFromMessage(
	client: EClient,
	userId: string,
	message: Djs.Message,
	charName?: string | null,
	options?: {
		integrateCombinaison?: boolean;
		allowAccess?: boolean;
		skipNotFound?: boolean;
		fetchAvatar?: boolean;
		fetchChannel?: boolean;
		fetchMessage?: boolean;
		guildId?: string;
	}
): Promise<{ userData?: UserData; charName?: string } | undefined> {
	return getUserFrom(client, userId, charName, { message, type: "message" }, options);
}

/**
 * Retrieves a user's character data from a Discord message based on guild settings and user ID.
 *
 * Searches in-memory cache first, then fetches the relevant message from the user's character thread if necessary. Validates access permissions for private characters and supports optional behaviors such as skipping errors or fetching additional data.
 *
 * @param {EClient} client
 * @param {string} userId - The Discord user ID whose character data is being retrieved.
 * @param {Djs.BaseInteraction} interaction
 * @param {string|null|undefined} charName - The character name to search for, if applicable.
 * @param options - Optional settings to control data integration, access checks, error handling, and additional data fetching.
 * @returns The user's character data, or `undefined` if not found and `skipNotFound` is enabled.
 *
 * @throws {Error} If the user's character thread is missing, access is denied to a private character, or the user is not found (unless `skipNotFound` is true).
 */
export async function getUserFromInteraction(
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
		fetchMessage?: boolean;
		guildId?: string;
		cleanUrl?: boolean;
	}
): Promise<{ userData?: UserData; charName?: string } | undefined> {
	return getUserFrom(
		client,
		userId,
		charName,
		{ interaction, type: "interaction" },
		options
	);
}

/**
 * Retrieves a record mapping user IDs to character data based on interaction options.
 *
 * Searches for a character by user or character name within the guild's stored user data. If a character name is provided without a user, searches all users for a matching character. If no character is found and strict mode is enabled, returns `undefined`. Replies with an error embed if guild data is missing.
 *
 * @param interaction
 * @param client
 * @param t
 * @param strict - If true, uses strict substring matching for character names.
 * @returns A record of user IDs to their corresponding character data, or `undefined` if not found.
 */
export async function getRecordChar(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	t: Translation,
	strict = true
): Promise<Record<string, UserGuildData> | undefined> {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const guildData = client.settings.get(interaction.guildId as string);
	const ul = ln(interaction.locale as Djs.Locale);
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
		coord: ids,
		isInDb: message.channel.id === ids.channelId && message.id === ids.messageId,
	};
}

/**
 * Extracts the user ID and character name from an embed in a button or modal interaction.
 *
 * Throws an error if the embed, user ID, or a valid thread or text channel is not found.
 *
 * @param interaction
 * @param ul
 * @param first - If true, selects the first embed from the message.
 * @returns An object containing the user ID, character name (if set), and the interaction channel.
 *
 * @throws {Error} If the embed is not found in the message.
 * @throws {Error} If the user ID is not found in the embed.
 * @throws {Error} If the interaction channel is not a thread or text channel.
 */
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
		if (firstEmbed) userEmbed = new Djs.EmbedBuilder(firstEmbed.toJSON());
	}
	if (!userEmbed) throw new BotError(ul("error.embed.notFound"), botErrorOptions);
	const userID = userEmbed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	if (!userID) throw new BotError(ul("error.user.notFound"), botErrorOptions);
	if (
		!interaction.channel ||
		(!(interaction.channel instanceof Djs.ThreadChannel) &&
			!(interaction.channel instanceof Djs.TextChannel))
	)
		throw new BotError(ul("error.channel.thread"), botErrorOptions);
	let userName = userEmbed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.character")?.value;
	if (userName === ul("common.noSet")) userName = undefined;
	return { thread: interaction.channel, userID, userName };
}

/**
 * Retrieves user statistics and related data for a command interaction.
 *
 * Attempts to obtain the user's character statistics based on the interaction options and guild configuration. Handles cases where statistics are required by the dice template, falling back to the first registered character or a minimal template if necessary. Replies with error messages if required data is missing.
 *
 * @returns An object containing the user's statistics, translation object, selected character name, and interaction options, or `undefined` if data is unavailable.
 */
export async function getStatistics(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	skipNotFound = false
) {
	if (!interaction.guild || !interaction.channel) return undefined;
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const { ul, config: guildData } = getLangAndConfig(client, interaction);
	if (!guildData) return;
	let optionChar = options.getString(t("common.character")) ?? undefined;
	const charName = optionChar?.standardize();

	let userStatistique = (
		await getUserFromInteraction(client, interaction.user.id, interaction, charName, {
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
		//find the first character registered
		const char = await getFirstChar(client, interaction, ul, skipNotFound);
		userStatistique = char?.userStatistique?.userData;
		optionChar = char?.optionChar;
	}

	if (!needStats && !userStatistique && template) {
		optionChar = originalOptionChar;
		//we can use the dice without an user i guess
		userStatistique = {
			damage: template?.damage,
			template: {
				critical: template?.critical,
				customCritical: template?.customCritical,
				diceType: template?.diceType,
			},
		};
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
			interaction.user.id,
			ul,
			{
				userData: userStatistique,
			}
		);
	}

	return { optionChar, options, ul, userStatistique };
}

/**
 * Retrieves the value of a specified statistic from a user's character data, using fallback names if necessary.
 *
 * If the statistic is not found under the given name, attempts to resolve it using alternative names from the guild's template settings. Throws an error if the statistic cannot be found.
 *
 * @param userStatistique - The user's character data containing statistics.
 * @param standardizedStatistic - The primary name of the statistic to retrieve.
 * @param ul - Translation function for error messages.
 * @param client
 * @param guild
 * @param optionChar - The character name, if specified.
 * @param statistic - The original statistic name requested.
 * @returns An object containing the statistic value, the resolved standardized statistic name, and the original statistic string.
 *
 * @throws {Error} If the statistic cannot be found in the user's data or via template fallbacks.
 */
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
