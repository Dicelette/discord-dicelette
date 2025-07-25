import { isNumber, type StatisticalTemplate } from "@dicelette/core";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { Characters, Translation, UserData } from "@dicelette/types";
import { cleanAvatarUrl, logger, NoEmbed } from "@dicelette/utils";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { Dice, Stats } from "features";
import * as Messages from "messages";
import { addAutoRole, fetchChannel, getLangAndConfig, pingModeratorRole } from "utils";

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
	const embed = Messages.getEmbeds(ul, interaction.message, "user");
	if (!embed || !dbTemplate.statistics) return;
	const statsEmbed =
		Messages.getEmbeds(ul, interaction.message, "stats") ?? Messages.createStatsEmbed(ul);
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
	await Stats.show(interaction, dbTemplate, statsAlreadySet, page + 1);
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

async function sendValidationMessage(
	interaction: Djs.ButtonInteraction,
	interactionUser: Djs.User,
	ul: Translation,
	client: EClient
) {
	const logChannel = client.settings.get(interaction.guild!.id, "logs");
	if (logChannel)
		await Messages.sendLogs(
			ul("logs.validationWaiting", {
				user: `${interactionUser.id}`,
				url: interaction.message.url,
				role: `\n -# ${pingModeratorRole(interaction.guild!)}`,
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
					user: `${interactionUser.id}`,
					url: interaction.message.url,
					role: `\n -# ${pingModeratorRole(interaction.guild!)}`,
				}),
			});
		} else {
			//send a DM to the owner
			const owner = await interaction.guild?.fetchOwner();
			if (owner) {
				try {
					await owner.send({
						content: ul("logs.validationWaiting", {
							user: `${interactionUser.id}`,
							url: interaction.message.url,
							role: "",
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
	const userEmbed = Messages.getEmbeds(ul, interaction.message, "user");
	if (!userEmbed) throw new NoEmbed();
	const oldEmbedsFields = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
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
	const userDataEmbed = Messages.createUserEmbed(
		ul,
		userEmbed.toJSON().thumbnail?.url || "",
		userID,
		charName
	);
	const oldDiceEmbeds = Messages.getEmbeds(ul, interaction.message, "damage");
	const oldStatsEmbed = Messages.getEmbeds(ul, interaction.message, "stats");
	const oldDiceEmbedsFields = oldDiceEmbeds ? (oldDiceEmbeds.toJSON().fields ?? []) : [];
	const statEmbedsFields = oldStatsEmbed ? (oldStatsEmbed.toJSON().fields ?? []) : [];
	let diceEmbed: Djs.EmbedBuilder | undefined;
	let statsEmbed: Djs.EmbedBuilder | undefined;
	for (const field of oldDiceEmbedsFields) {
		if (!diceEmbed) {
			diceEmbed = Messages.createDiceEmbed(ul);
		}
		diceEmbed.addFields({
			name: field.name.unidecode(true).capitalize(),
			value: `\`${field.value}\``,
			inline: true,
		});
	}
	for (const field of statEmbedsFields) {
		if (!statsEmbed) {
			statsEmbed = Messages.createStatsEmbed(ul);
		}
		statsEmbed.addFields({
			name: field.name.unidecode(true).capitalize(),
			value: field.value,
			inline: true,
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

	const damageFields = diceEmbed?.toJSON().fields ?? [];
	let templateDamage: Record<string, string> | undefined;
	if (damageFields.length > 0) {
		templateDamage = {};

		for (const damage of damageFields) {
			templateDamage[damage.name.unidecode(true)] = damage.value;
		}
	}
	// Add the template damage to the user if exists
	for (const [name, dice] of Object.entries(template.damage ?? {})) {
		if (!templateDamage) templateDamage = {};
		templateDamage[name] = dice;
		if (!diceEmbed) {
			diceEmbed = Messages.createDiceEmbed(ul);
		}
		//prevent duplicate fields in the dice embed
		if (Dice.findDuplicate(diceEmbed, name)) continue;
		//why i forgot this????
		diceEmbed.addFields({
			name: `${name}`,
			value: `\`${dice}\``,
			inline: true,
		});
	}
	const jsonThumbnail = userEmbed.toJSON().thumbnail?.url;
	const userStatistique: UserData = {
		userName: charName,
		stats,
		template: {
			diceType: template.diceType,
			critical: template.critical,
			customCritical: template.customCritical,
		},
		damage: templateDamage,
		private: isPrivate,
		avatar: jsonThumbnail ? cleanAvatarUrl(jsonThumbnail) : undefined,
	};
	let templateEmbed: Djs.EmbedBuilder | undefined;
	if (template.diceType || template.critical || template.customCritical) {
		templateEmbed = Messages.createTemplateEmbed(ul);
		if (template.diceType)
			templateEmbed.addFields({
				name: ul("common.dice").capitalize(),
				value: `\`${template.diceType}\``,
				inline: true,
			});
		if (template.critical?.success) {
			templateEmbed.addFields({
				name: ul("roll.critical.success"),
				value: `\`${template.critical.success}\``,
				inline: true,
			});
		}
		if (template.critical?.failure) {
			templateEmbed.addFields({
				name: ul("roll.critical.failure"),
				value: `\`${template.critical.failure}\``,
				inline: true,
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
		{ stats: !!statsEmbed, dice: !!diceEmbed, template: !!templateEmbed },
		client.settings,
		channelToPost.replace("<#", "").replace(">", ""),
		characters
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
