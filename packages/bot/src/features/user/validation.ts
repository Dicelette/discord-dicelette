import {
	addAutoRole,
	fetchChannel,
	getInteractionContext as getLangAndConfig,
	pingModeratorRole,
	reuploadAvatar,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { isNumber, type StatisticalTemplate } from "@dicelette/core";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { Characters, Translation, UserData } from "@dicelette/types";
import {
	allValueUndefOrEmptyString,
	cleanAvatarUrl,
	logger,
	NoEmbed,
	QUERY_URL_PATTERNS,
} from "@dicelette/utils";
import * as Djs from "discord.js";
import { Macro, Stats } from "features";
import * as Messages from "messages";
import { selfRegisterAllowance } from "utils";

/**
 * Interaction to continue to the next page of the statistics when registering a new user
 */
export async function continuePage(
	interaction: Djs.ButtonInteraction,
	dbTemplate: StatisticalTemplate,
	ul: Translation,
	interactionUser: Djs.User,
	selfRegister?: boolean | string
) {
	const isModerator =
		selfRegister ||
		interaction.guild?.members.cache
			.get(interactionUser.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (!isModerator) {
		await Messages.reply(interaction, {
			content: ul("modals.noPermission"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const pageNumber = interaction.customId.replace("page", "");
	const page = !isNumber(pageNumber) ? 1 : Number.parseInt(pageNumber, 10);
	const embed = Messages.getEmbeds(interaction.message, "user");
	if (!embed || !dbTemplate.statistics) return;
	const statsEmbed =
		Messages.getEmbeds(interaction.message, "stats") ?? Messages.createStatsEmbed(ul);
	const allTemplateStat = Object.keys(dbTemplate.statistics).map((stat) =>
		stat.unidecode()
	);

	const statsAlreadySet = Object.keys(parseEmbedFields(statsEmbed.toJSON() as Djs.Embed))
		.filter((stat) => allTemplateStat.includes(stat.unidecode()))
		.map((stat) => stat.unidecode());
	if (statsAlreadySet.length === allTemplateStat.length) {
		await Messages.reply(interaction, {
			content: ul("modals.alreadySet"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	await Stats.show(
		interaction,
		dbTemplate,
		statsAlreadySet,
		page + 1,
		selfRegisterAllowance(selfRegister).moderation
	);
}

/**
 * Validate the user and create the embeds when the button is clicked
 */

export async function button(
	interaction: Djs.ButtonInteraction,
	interactionUser: Djs.User,
	template: StatisticalTemplate,
	ul: Translation,
	client: EClient,
	characters: Characters
) {
	const selfAllow = client.settings.get(interaction.guild!.id, "allowSelfRegister");
	const selfRegisterAllow = selfAllow ? /true/.test(selfAllow.toString()) : false;
	const isModerator =
		selfRegisterAllow ||
		interaction.guild?.members.cache
			.get(interactionUser.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (isModerator) await validateUser(interaction, template, client, characters);
	else {
		let notAllowedMsg = ul("modals.noPermission");
		notAllowedMsg += `\n${ul("modals.onlyModerator")}`;
		await sendValidationMessage(interaction, interactionUser, ul, client);
		await Messages.reply(interaction, {
			content: notAllowedMsg,
			flags: Djs.MessageFlags.Ephemeral,
		});
	}
}

export async function sendValidationMessage(
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
	interactionUser: Djs.User,
	ul: Translation,
	client: EClient,
	url?: string
) {
	const logChannel = client.settings.get(interaction.guild!.id, "logs");
	if (!url) url = interaction.message?.url ?? "";
	if (logChannel)
		await Messages.sendLogs(
			ul("logs.validationWaiting", {
				role: `\n-# ${pingModeratorRole(interaction.guild!)}`,
				url,
				user: `${interactionUser.id}`,
			}),
			interaction.guild!,
			client.settings,
			true
		);
	else {
		//send a message in system channel if any
		const systemChannel = interaction.guild?.safetyAlertsChannel;
		if (systemChannel?.isSendable()) {
			await systemChannel.send({
				content: ul("logs.validationWaiting", {
					role: `\n-# ${pingModeratorRole(interaction.guild!)}`,
					url,
					user: `${interactionUser.id}`,
				}),
			});
		} else {
			//send a DM to the owner
			const owner = await interaction.guild?.fetchOwner();
			if (owner) {
				try {
					await owner.send({
						content: ul("logs.validationWaiting", {
							role: "",
							url,
							user: `${interactionUser.id}`,
						}),
					});
				} catch (e) {
					logger.warn(e, "button: can't send DM to the owner");
				}
			}
		}
	}
}
/**
 * Validates a user's registration and compiles their statistics, then posts the finalized embeds and user data to the appropriate Discord thread or channel.
 *
 * Retrieves and parses user, stats, and damage embeds from the interaction message, normalizes and merges data with the provided template, and constructs new embeds for user information, statistics, dice, and template details. Handles missing or invalid user/channel data with error responses. Assigns roles as needed and confirms completion to the user.
 *
 * @throws {NoEmbed} If the required user embed is missing from the interaction message.
 */
export async function validateUser(
	interaction: Djs.ButtonInteraction,
	template: StatisticalTemplate,
	client: EClient,
	characters: Characters
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userEmbed = Messages.getEmbeds(interaction.message, "user");
	if (!userEmbed) throw new NoEmbed();
	const oldEmbedsFields = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
	const jsonThumbnail = userEmbed.toJSON().thumbnail?.url;
	let userID = oldEmbedsFields?.["common.user"];
	let charName: string | undefined = oldEmbedsFields?.["common.charName"];
	const isPrivate = oldEmbedsFields["common.isPrivate"] === "common.yes";
	const channelToPost = oldEmbedsFields?.["common.channel"];
	if (channelToPost) {
		const channel = await fetchChannel(
			interaction.guild!,
			channelToPost.replace("<#", "").replace(">", "")
		);
		if (!channel) {
			await Messages.reply(interaction, {
				embeds: [
					Messages.embedError(
						ul("error.channel.notFound", { channel: channelToPost }),
						ul
					),
				],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
	}
	if (charName && charName === "common.noSet") charName = undefined;
	if (!userID) {
		await Messages.reply(interaction, {
			embeds: [Messages.embedError(ul("error.user.notFound"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	userID = userID.replace("<@", "").replace(">", "");
	const files = interaction.message.attachments.map(
		(att) => new Djs.AttachmentBuilder(att.url, { name: att.name })
	);
	let avatarStr = jsonThumbnail || "";
	if (jsonThumbnail?.match(QUERY_URL_PATTERNS.DISCORD_CDN)) {
		const fileName = jsonThumbnail.split("?")[0].split("/").pop() || `${userID}_avatar`;
		const result = await reuploadAvatar({ name: fileName, url: jsonThumbnail }, ul);
		avatarStr = result.name;
		files.push(result.newAttachment);
	}
	//prevent duplicate files
	const uniqueFiles = Array.from(new Set(files.map((f) => f.name))).map(
		(name) => files.find((f) => f.name === name)!
	);
	const userDataEmbed = Messages.createUserEmbed(ul, avatarStr, userID, charName);
	const oldDiceEmbeds = Messages.getEmbeds(interaction.message, "damage");
	const oldStatsEmbed = Messages.getEmbeds(interaction.message, "stats");
	const oldDiceEmbedsFields = oldDiceEmbeds ? (oldDiceEmbeds.toJSON().fields ?? []) : [];
	const statEmbedsFields = oldStatsEmbed ? (oldStatsEmbed.toJSON().fields ?? []) : [];
	let diceEmbed: Djs.EmbedBuilder | undefined;
	let statsEmbed: Djs.EmbedBuilder | undefined;
	for (const field of oldDiceEmbedsFields) {
		if (!diceEmbed) diceEmbed = Messages.createDiceEmbed(ul);

		diceEmbed.addFields({
			inline: true,
			name: field.name.unidecode(true).capitalize(),
			value: field.value && field.value.trim().length > 0 ? `\`${field.value}\`` : "_ _",
		});
	}
	for (const field of statEmbedsFields) {
		if (!statsEmbed) {
			statsEmbed = Messages.createStatsEmbed(ul);
		}
		statsEmbed.addFields({
			inline: true,
			name: field.name.unidecode(true).capitalize(),
			value: field.value,
		});
	}

	const parsedStats = statsEmbed
		? parseEmbedFields(statsEmbed.toJSON() as Djs.Embed)
		: undefined;
	const stats: Record<string, number> = {};
	for (const [name, value] of Object.entries(parsedStats ?? {})) {
		let statValue = Number.parseInt(value, 10);
		if (!isNumber(value)) {
			statValue = Number.parseInt(
				value.removeBacktick().split("=")[1].trim().removeBacktick().standardize(),
				10
			);
		}
		stats[name] = statValue;
	}

	const macroFields = diceEmbed?.toJSON().fields ?? [];
	let templateMacro: Record<string, string> | undefined;
	if (macroFields.length > 0) {
		templateMacro = {};

		for (const damage of macroFields) {
			if (damage.value.trim().length === 0) continue;
			templateMacro[damage.name.unidecode(true)] = damage.value;
		}
	}
	// Add the template damage to the user if exists
	for (const [name, dice] of Object.entries(template.damage ?? {})) {
		if (!templateMacro) templateMacro = {};
		templateMacro[name] = dice;
		if (!diceEmbed) {
			diceEmbed = Messages.createDiceEmbed(ul);
		}
		//prevent duplicate fields in the dice embed
		if (Macro.findDuplicate(diceEmbed, name)) continue;
		//why i forgot this????
		diceEmbed.addFields({
			inline: true,
			name: `${name}`,
			value: dice.trim().length > 0 ? `\`${dice}\`` : "_ _",
		});
	}
	const userStatistique: UserData = {
		avatar: jsonThumbnail ? cleanAvatarUrl(jsonThumbnail) : undefined,
		damage: templateMacro,
		private: isPrivate,
		stats,
		template: {
			critical: template.critical,
			customCritical: template.customCritical,
			diceType: template.diceType,
		},
		userName: charName,
	};
	let templateEmbed: Djs.EmbedBuilder | undefined;
	if (
		(template.diceType && template.diceType.length > 0) ||
		!allValueUndefOrEmptyString(template.critical) ||
		!allValueUndefOrEmptyString(template.customCritical)
	) {
		templateEmbed = Messages.createTemplateEmbed(ul);
		if (template.diceType && template.diceType.length > 0)
			templateEmbed.addFields({
				inline: true,
				name: ul("common.dice").capitalize(),
				value: `\`${template.diceType}\``,
			});
		if (template.critical?.success) {
			templateEmbed.addFields({
				inline: true,
				name: ul("roll.critical.success"),
				value: `\`${template.critical.success}\``,
			});
		}
		if (template.critical?.failure) {
			templateEmbed.addFields({
				inline: true,
				name: ul("roll.critical.failure"),
				value: `\`${template.critical.failure}\``,
			});
		}
		const criticalTemplate = template.customCritical ?? {};
		templateEmbed = Messages.createCustomCritical(templateEmbed, criticalTemplate);
	}
	const allEmbeds = Messages.createEmbedsList(
		userDataEmbed,
		statsEmbed,
		diceEmbed,
		templateEmbed
	);

	await Messages.repostInThread(
		allEmbeds,
		interaction,
		userStatistique,
		userID,
		ul,
		{ dice: !!diceEmbed, stats: !!statsEmbed, template: !!templateEmbed },
		client.settings,
		channelToPost.replace("<#", "").replace(">", ""),
		characters,
		uniqueFiles
	);
	try {
		await interaction.message.delete();
	} catch (e) {
		logger.warn(e, "validateUser: can't delete the message");
	}
	await addAutoRole(interaction, userID, !!diceEmbed, !!statsEmbed, client.settings);
	await Messages.reply(interaction, {
		content: ul("modals.finished"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	return;
}
