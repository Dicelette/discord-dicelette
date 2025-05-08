import { isNumber, type StatisticalTemplate } from "@dicelette/core";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { Characters, Settings, Translation, UserData } from "@dicelette/types";
import { cleanAvatarUrl, logger, NoEmbed } from "@dicelette/utils";
import * as Djs from "discord.js";
import { showStatistiqueModal } from "features";
import {
	createCustomCritical,
	createDiceEmbed,
	createEmbedsList,
	createStatsEmbed,
	createTemplateEmbed,
	createUserEmbed,
	embedError,
	getEmbeds,
	reply,
	repostInThread,
} from "messages";
import { addAutoRole, getLangAndConfig } from "utils";

/**
 * Interaction to continue to the next page of the statistics when registering a new user
 */
export async function continuePage(
	interaction: Djs.ButtonInteraction,
	dbTemplate: StatisticalTemplate,
	ul: Translation,
	interactionUser: Djs.User
) {
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (!isModerator) {
		await reply(interaction, {
			content: ul("modals.noPermission"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const pageNumber = interaction.customId.replace("page", "");
	const page = !isNumber(pageNumber) ? 1 : Number.parseInt(pageNumber, 10);
	const embed = getEmbeds(ul, interaction.message, "user");
	if (!embed || !dbTemplate.statistics) return;
	const statsEmbed = getEmbeds(ul, interaction.message, "stats") ?? createStatsEmbed(ul);
	const allTemplateStat = Object.keys(dbTemplate.statistics).map((stat) =>
		stat.unidecode()
	);

	const statsAlreadySet = Object.keys(parseEmbedFields(statsEmbed.toJSON() as Djs.Embed))
		.filter((stat) => allTemplateStat.includes(stat.unidecode()))
		.map((stat) => stat.unidecode());
	if (statsAlreadySet.length === allTemplateStat.length) {
		await reply(interaction, {
			content: ul("modals.alreadySet"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	await showStatistiqueModal(interaction, dbTemplate, statsAlreadySet, page + 1);
}

/**
 * Validate the user and create the embeds when the button is clicked
 */

export async function validateUserButton(
	interaction: Djs.ButtonInteraction,
	interactionUser: Djs.User,
	template: StatisticalTemplate,
	ul: Translation,
	db: Settings,
	characters: Characters
) {
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (isModerator) await validateUser(interaction, template, db, characters);
	else
		await reply(interaction, {
			content: ul("modals.noPermission"),
			flags: Djs.MessageFlags.Ephemeral,
		});
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
	db: Settings,
	characters: Characters
) {
	const { ul } = getLangAndConfig(db, interaction);
	const userEmbed = getEmbeds(ul, interaction.message, "user");
	if (!userEmbed) throw new NoEmbed();
	const oldEmbedsFields = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
	let userID = oldEmbedsFields?.["common.user"];
	let charName: string | undefined = oldEmbedsFields?.["common.charName"];
	const isPrivate = oldEmbedsFields["common.isPrivate"] === "common.yes";
	const channelToPost = oldEmbedsFields?.["common.channel"];
	if (channelToPost) {
		const channel = await interaction.guild?.channels.fetch(
			channelToPost.replace("<#", "").replace(">", "")
		);
		if (!channel) {
			await reply(interaction, {
				embeds: [
					embedError(ul("error.channel.notFound", { channel: channelToPost }), ul),
				],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
	}
	if (charName && charName === "common.noSet") charName = undefined;
	if (!userID) {
		await reply(interaction, {
			embeds: [embedError(ul("error.user.notFound"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	userID = userID.replace("<@", "").replace(">", "");
	const userDataEmbed = createUserEmbed(
		ul,
		userEmbed.toJSON().thumbnail?.url || "",
		userID,
		charName
	);
	const oldDiceEmbeds = getEmbeds(ul, interaction.message, "damage");
	const oldStatsEmbed = getEmbeds(ul, interaction.message, "stats");
	const oldDiceEmbedsFields = oldDiceEmbeds ? (oldDiceEmbeds.toJSON().fields ?? []) : [];
	const statEmbedsFields = oldStatsEmbed ? (oldStatsEmbed.toJSON().fields ?? []) : [];
	let diceEmbed: Djs.EmbedBuilder | undefined = undefined;
	let statsEmbed: Djs.EmbedBuilder | undefined = undefined;
	for (const field of oldDiceEmbedsFields) {
		if (!diceEmbed) {
			diceEmbed = createDiceEmbed(ul);
		}
		diceEmbed.addFields({
			name: field.name.unidecode(true).capitalize(),
			value: `\`${field.value}\``,
			inline: true,
		});
	}
	for (const field of statEmbedsFields) {
		if (!statsEmbed) {
			statsEmbed = createStatsEmbed(ul);
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
	let templateDamage: Record<string, string> | undefined = undefined;
	if (damageFields.length > 0) {
		templateDamage = {};

		for (const damage of damageFields) {
			templateDamage[damage.name.unidecode(true)] = damage.value;
		}
	}
	for (const [name, dice] of Object.entries(template.damage ?? {})) {
		if (!templateDamage) templateDamage = {};
		templateDamage[name] = dice;
		if (!diceEmbed) {
			diceEmbed = createDiceEmbed(ul);
		}
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
	let templateEmbed: Djs.EmbedBuilder | undefined = undefined;
	if (template.diceType || template.critical || template.customCritical) {
		templateEmbed = createTemplateEmbed(ul);
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
		templateEmbed = createCustomCritical(templateEmbed, criticalTemplate);
	}
	const allEmbeds = createEmbedsList(userDataEmbed, statsEmbed, diceEmbed, templateEmbed);
	await repostInThread(
		allEmbeds,
		interaction,
		userStatistique,
		userID,
		ul,
		{ stats: !!statsEmbed, dice: !!diceEmbed, template: !!templateEmbed },
		db,
		channelToPost.replace("<#", "").replace(">", ""),
		characters
	);
	try {
		await interaction.message.delete();
	} catch (e) {
		logger.warn(e, "validateUser: can't delete the message");
	}
	await addAutoRole(interaction, userID, !!statsEmbed, !!diceEmbed, db);
	await reply(interaction, {
		content: ul("modals.finished"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	return;
}
