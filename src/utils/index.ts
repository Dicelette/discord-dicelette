// noinspection SuspiciousTypeOfGuard

import type { UserData, UserRegistration } from "@interfaces/database";
import { findln } from "@localization";
import { editUserButtons, selectEditMenu } from "@utils/buttons";
import { registerUser, setDefaultManagerId } from "@utils/db";
import { parseEmbedFields } from "@utils/parse";

import * as Djs from "discord.js";
import { evaluate } from "mathjs";
import moment from "moment";
import { deleteAfter } from "@commands/rolls/base_roll";
import type { DiscordChannel, Settings, Translation } from "@interfaces/discord";
import { TUTORIAL_IMAGES } from "@interfaces/constant";
import { logger } from "@main";
/**
 * Set the tags for thread channel in forum
 */
export async function setTagsForRoll(forum: Djs.ForumChannel) {
	//check if the tags `🪡 roll logs` exists
	const allTags = forum.availableTags;
	const diceRollTag = allTags.find(
		(tag) => tag.name === "Dice Roll" && tag.emoji?.name === "🪡"
	);
	if (diceRollTag) return diceRollTag;

	const availableTags: Djs.GuildForumTagData[] = allTags.map((tag) => {
		return {
			id: tag.id,
			moderated: tag.moderated,
			name: tag.name,
			emoji: tag.emoji,
		};
	});
	availableTags.push({
		name: "Dice Roll",
		emoji: { id: null, name: "🪡" },
	});
	await forum.setAvailableTags(availableTags);

	return forum.availableTags.find(
		(tag) => tag.name === "Dice Roll" && tag.emoji?.name === "🪡"
	) as Djs.GuildForumTagData;
}

/**
 * Repost the character sheet in the thread / channel selected with `guildData.managerId`
 */
export async function repostInThread(
	embed: Djs.EmbedBuilder[],
	interaction: Djs.BaseInteraction,
	userTemplate: UserData,
	userId: string,
	ul: Translation,
	which: { stats?: boolean; dice?: boolean; template?: boolean },
	guildData: Settings,
	threadId: string
) {
	userTemplate.userName = userTemplate.userName
		? userTemplate.userName.toLowerCase()
		: undefined;
	const damageName = userTemplate.damage ? Object.keys(userTemplate.damage) : undefined;
	const channel = interaction.channel;
	// noinspection SuspiciousTypeOfGuard
	if (!channel || channel instanceof Djs.CategoryChannel) return;
	if (!guildData)
		throw new Error(
			ul("error.generic.e", {
				e: "No server data found in database for this server.",
			})
		);
	const dataToSend = {
		embeds: embed,
		components: [editUserButtons(ul, which.stats, which.dice), selectEditMenu(ul)],
	};
	let isForumThread = false;
	let thread = await searchUserChannel(guildData, interaction, ul, threadId, true);
	let msg: Djs.Message | undefined = undefined;
	if (!thread) {
		const channel = await interaction.guild?.channels.fetch(threadId);
		// noinspection SuspiciousTypeOfGuard
		if (channel && channel instanceof Djs.ForumChannel) {
			const userName =
				userTemplate.userName ??
				(await interaction.guild?.members.fetch(userId))?.displayName;
			//create a new thread in the forum
			const newThread = await channel.threads.create({
				name: userName ?? `${ul("common.sheet")} ${ul("common.character").toUpperCase()}`,
				autoArchiveDuration: Djs.ThreadAutoArchiveDuration.OneWeek,
				message: dataToSend,
			});
			thread = newThread as Djs.AnyThreadChannel;
			isForumThread = true;
			const starterMsg = await newThread.fetchStarterMessage();
			if (!starterMsg) throw new Error(ul("error.noThread"));
			msg = starterMsg;
			const ping = await thread.send(
				interaction.user.id !== userId
					? `<@${interaction.user.id}> || <@${userId}>`
					: `<@${interaction.user.id}>`
			);
			await deleteAfter(ping, 5000);
		}
	} else {
		// noinspection SuspiciousTypeOfGuard
		if (!thread && channel instanceof Djs.TextChannel) {
			thread = (await channel.threads.fetch()).threads.find(
				(thread) => thread.name === "📝 • [STATS]"
			) as Djs.AnyThreadChannel | undefined;
			if (!thread) {
				thread = (await channel.threads.create({
					name: "📝 • [STATS]",
					autoArchiveDuration: 10080,
				})) as Djs.AnyThreadChannel;
				setDefaultManagerId(guildData, interaction, thread.id);
			}
		}
	}
	if (!thread) {
		throw new Error(ul("error.noThread"));
	}
	if (!isForumThread) msg = await thread.send(dataToSend);
	if (!msg) throw new Error(ul("error.noThread"));
	const userRegister: UserRegistration = {
		userID: userId,
		isPrivate: userTemplate.private,
		charName: userTemplate.userName,
		damage: damageName,
		msgId: [msg.id, thread.id],
	};
	registerUser(userRegister, interaction, guildData);
}

/**
 * Create a neat timestamp in the discord format
 */
export function timestamp(settings: Settings, guildID: string) {
	if (settings.get(guildID, "timestamp"))
		return ` • <t:${moment().unix()}:d>-<t:${moment().unix()}:t>`;
	return "";
}

export class NoEmbed extends Error {
	constructor() {
		super();
		this.name = "NoEmbed";
	}
}

export class InvalidCsvContent extends Error {
	file?: string;
	constructor(file?: string) {
		super();
		this.name = "InvalidCsvContent";
		this.file = file;
	}
}

export class InvalidURL extends Error {
	constructor(url?: string) {
		super(url);
		this.name = "InvalidURL";
	}
}

export class NoChannel extends Error {
	constructor() {
		super();
		this.name = "NoChannel";
	}
}

/**
 * Verify if an array is equal to another
 * @param array1 {string[]|undefined}
 * @param array2 {string[]|undefined}
 */
export function isArrayEqual(array1: string[] | undefined, array2: string[] | undefined) {
	if (!array1 || !array2) return false;
	return (
		array1.length === array2.length &&
		array1.every((value, index) => value === array2[index])
	);
}

/**
 * Replace the {{}} in the dice string and evaluate the interior if any
 * @param dice {string}
 */
export function replaceFormulaInDice(dice: string) {
	// noinspection RegExpRedundantEscape
	const formula = /(?<formula>\{{2}(.+?)\}{2})/gim;
	const formulaMatch = formula.exec(dice);
	if (formulaMatch?.groups?.formula) {
		const formula = formulaMatch.groups.formula.replaceAll("{{", "").replaceAll("}}", "");
		try {
			const result = evaluate(formula);
			return cleanedDice(dice.replace(formulaMatch.groups.formula, result.toString()));
		} catch (error) {
			throw new Error(
				`[error.invalidFormula, common.space]: ${formulaMatch.groups.formula} [From: replaceFormulaInDice]`
			);
		}
	}
	return cleanedDice(dice);
}

// noinspection JSUnusedGlobalSymbols
/**
 * Replace the stat name by their value using stat and after evaluate any formula using `replaceFormulaInDice`
 */
export function generateStatsDice(
	originalDice: string,
	stats?: { [name: string]: number }
) {
	let dice = originalDice;
	if (stats && Object.keys(stats).length > 0) {
		//damage field support adding statistic, like : 1d6 + strength
		//check if the value contains a statistic & calculate if it's okay
		//the dice will be converted before roll
		const allStats = Object.keys(stats);
		for (const stat of allStats) {
			const regex = new RegExp(escapeRegex(stat.removeAccents()), "gi");
			if (dice.match(regex)) {
				const statValue = stats[stat];
				dice = dice.replace(regex, statValue.toString());
			}
		}
	}
	return replaceFormulaInDice(dice);
}

/**
 * Escape regex string
 * @param string {string}
 */
export function escapeRegex(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace the ++ +- -- by their proper value:
 * - `++` = `+`
 * - `+-` = `-`
 * - `--` = `+`
 * @param dice {string}
 */
export function cleanedDice(dice: string) {
	return dice.replaceAll("+-", "-").replaceAll("--", "+").replaceAll("++", "+");
}
/**
 * filter the choices by removing the accents and check if it includes the removedAccents focused
 * @param choices {string[]}
 * @param focused {string}
 */
export function filterChoices(choices: string[], focused: string) {
	//remove duplicate from choices, without using set
	const values = uniqueValues(choices).filter((choice) =>
		choice.subText(focused.removeAccents())
	);
	if (values.length >= 25) return values.slice(0, 25);
	return values;
}

export function uniqueValues(array: string[]) {
	const seen: { [key: string]: boolean } = {};
	const uniqueArray: string[] = [];

	for (const item of array) {
		const formattedItem = item.standardize();
		if (!seen[formattedItem]) {
			seen[formattedItem] = true;
			uniqueArray.push(item);
		}
	}
	return uniqueArray;
}

/**
 * Parse the fields in stats, used to fix combinaison and get only them and not their result
 */
export function parseStatsString(statsEmbed: Djs.EmbedBuilder) {
	const stats = parseEmbedFields(statsEmbed.toJSON() as Djs.Embed);
	const parsedStats: { [name: string]: number } = {};
	for (const [name, value] of Object.entries(stats)) {
		let number = Number.parseInt(value, 10);
		if (Number.isNaN(number)) {
			const combinaison = value.replace(/`(.*)` =/, "").trim();
			number = Number.parseInt(combinaison, 10);
		}
		parsedStats[name] = number;
	}
	return parsedStats;
}

export async function sendLogs(message: string, guild: Djs.Guild, db: Settings) {
	const guildData = db.get(guild.id);
	if (!guildData?.logs) return;
	const channel = guildData.logs;
	try {
		const channelToSend = (await guild.channels.fetch(channel)) as Djs.TextChannel;
		await channelToSend.send(message);
	} catch (error) {
		return;
	}
}

export function displayOldAndNewStats(
	oldStats?: Djs.APIEmbedField[],
	newStats?: Djs.APIEmbedField[]
) {
	let stats = "";
	if (oldStats && newStats) {
		for (const field of oldStats) {
			const name = field.name.toLowerCase();
			const newField = newStats.find((f) => f.name.toLowerCase() === name);
			if (!newField) {
				stats += `- ~~${field.name}: ${field.value}~~\n`;
				continue;
			}
			if (field.value === newField.value) continue;
			stats += `- ${field.name}: ${field.value} ⇒ ${newField.value}\n`;
		}
		//verify if there is new stats
		for (const field of newStats) {
			const name = field.name.toLowerCase();
			if (!oldStats.find((f) => f.name.toLowerCase() === name)) {
				stats += `- ${field.name}: 0 ⇒ ${field.value}\n`;
			}
		}
	}
	return stats;
}

export async function searchUserChannel(
	guildData: Settings,
	interaction: Djs.BaseInteraction,
	ul: Translation,
	channelId: string,
	register?: boolean
): Promise<DiscordChannel> {
	let thread: Djs.TextChannel | Djs.AnyThreadChannel | undefined | Djs.GuildBasedChannel =
		undefined;
	try {
		const channel = await interaction.guild?.channels.fetch(channelId);
		if (channel instanceof Djs.ForumChannel && register) return;
		if (
			!channel ||
			channel instanceof Djs.CategoryChannel ||
			channel instanceof Djs.ForumChannel ||
			channel instanceof Djs.MediaChannel ||
			channel instanceof Djs.StageChannel ||
			channel instanceof Djs.VoiceChannel
		) {
			if (
				interaction instanceof Djs.CommandInteraction ||
				interaction instanceof Djs.ButtonInteraction ||
				interaction instanceof Djs.ModalSubmitInteraction
			)
				await interaction?.channel?.send({
					embeds: [embedError(ul("error.noThread"), ul)],
				});

			await sendLogs(ul("error.noThread"), interaction.guild as Djs.Guild, guildData);
			return;
		}
		thread = channel;
	} catch (error) {
		console.error("Error while fetching channel", error);
		return;
	}
	if (!thread) {
		if (
			interaction instanceof Djs.CommandInteraction ||
			interaction instanceof Djs.ButtonInteraction ||
			interaction instanceof Djs.ModalSubmitInteraction
		) {
			if (interaction.replied)
				await interaction.editReply({ embeds: [embedError(ul("error.noThread"), ul)] });
			else await reply(interaction, { embeds: [embedError(ul("error.noThread"), ul)] });
		} else
			await sendLogs(ul("error.noThread"), interaction.guild as Djs.Guild, guildData);
		return;
	}
	if (thread.isThread() && thread.archived) thread.setArchived(false);
	return thread;
}

export async function downloadTutorialImages() {
	const imageBufferAttachments: Djs.AttachmentBuilder[] = [];
	for (const url of TUTORIAL_IMAGES) {
		const index = TUTORIAL_IMAGES.indexOf(url);
		const newMessageAttachment = new Djs.AttachmentBuilder(url, {
			name: `tutorial_${index}.png`,
		});
		imageBufferAttachments.push(newMessageAttachment);
	}
	return imageBufferAttachments;
}

export async function reply(
	interaction:
		| Djs.CommandInteraction
		| Djs.ModalSubmitInteraction
		| Djs.ButtonInteraction
		| Djs.StringSelectMenuInteraction,
	options: string | Djs.InteractionReplyOptions | Djs.MessagePayload
) {
	return interaction.replied || interaction.deferred
		? await interaction.editReply(options)
		: await interaction.reply(options);
}

export const embedError = (error: string, ul: Translation, cause?: string) => {
	const stack = findln(error);
	return new Djs.EmbedBuilder()
		.setDescription(error)
		.setColor("Red")
		.setFooter({ text: cause ?? stack.replace("error.", "") })
		.setAuthor({ name: ul("common.error"), iconURL: "https://i.imgur.com/2ulUJCc.png" })
		.setTimestamp();
};

async function fetchDiceRole(diceEmbed: boolean, guild: Djs.Guild, role?: string) {
	if (!diceEmbed || !role) return;
	const diceRole = guild.roles.cache.get(role);
	if (!diceRole) return await guild.roles.fetch(role);
	return diceRole;
}

async function fetchStatsRole(statsEmbed: boolean, guild: Djs.Guild, role?: string) {
	if (!statsEmbed || !role) return;
	const statsRole = guild.roles.cache.get(role);
	if (!statsRole) return await guild.roles.fetch(role);
	return statsRole;
}

export async function addAutoRole(
	interaction: Djs.BaseInteraction,
	member: string,
	diceEmbed: boolean,
	statsEmbed: boolean,
	db: Settings
) {
	const autoRole = db.get(interaction.guild!.id, "autoRole");
	if (!autoRole) return;
	try {
		let guildMember = interaction.guild!.members.cache.get(member);
		if (!guildMember) {
			//Use the fetch in case the member is not in the cache
			guildMember = await interaction.guild!.members.fetch(member);
		}
		//fetch role
		const diceRole = await fetchDiceRole(diceEmbed, interaction.guild!, autoRole.dice);
		const statsRole = await fetchStatsRole(
			statsEmbed,
			interaction.guild!,
			autoRole.stats
		);

		if (diceEmbed && diceRole) await guildMember.roles.add(diceRole);

		if (statsEmbed && statsRole) await guildMember.roles.add(statsRole);
	} catch (e) {
		logger.error("Error while adding role", e);
		//delete the role from database so it will be skip next time
		db.delete(interaction.guild!.id, "autoRole");
		const dbLogs = db.get(interaction.guild!.id, "logs");
		const errorMessage = `\`\`\`\n${(e as Error).message}\n\`\`\``;
		if (dbLogs) {
			const logs = await interaction.guild!.channels.fetch(dbLogs);
			if (logs instanceof Djs.TextChannel) {
				logs.send(errorMessage);
			}
		} else {
			//Dm the server owner because it's pretty important to know
			const owner = await interaction.guild!.fetchOwner();
			owner.send(errorMessage);
		}
	}
}

/**
 * Check if the user have access to the channel where the data is stored
 * - It always return true:
 * 	- if the user is the owner of the data
 * 	- if the user have the permission to manage roles
 * - It returns false:
 * 	- If there is no user or member found
 * 	- If the thread doesn't exist (data will be not found anyway)
 *
 * It will ultimately check if the user have access to the channel (with reading permission)
 * @param interaction {Djs.BaseInteraction}
 * @param thread {Djs.GuildChannelResolvable} if undefined, return false (because it's probably that the channel doesn't exist anymore, so we don't care about it)
 * @param user {User | null} if null, return false
 * @returns {boolean}
 */
export function haveAccess(
	interaction: Djs.BaseInteraction,
	thread: Djs.GuildChannelResolvable,
	user?: string
): boolean {
	if (!user) return false;
	if (user === interaction.user.id) return true;
	//verify if the user have access to the channel/thread, like reading the channel
	const member = interaction.guild?.members.cache.get(interaction.user.id);
	if (!member || !thread) return false;
	return (
		member.permissions.has(Djs.PermissionFlagsBits.ManageRoles) ||
		member.permissionsIn(thread).has(Djs.PermissionFlagsBits.ViewChannel)
	);
}
