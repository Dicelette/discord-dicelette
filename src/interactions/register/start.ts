import type { StatisticalTemplate } from "@dicelette/core";
import { createStatsEmbed } from "@interactions";
import { embedStatistiques, showStatistiqueModal } from "@interactions/add/stats";
import type { Settings, Translation } from "@interfaces/discord";
import { createEmbedFirstPage } from "@register/validate";
import { embedError, reply } from "@utils";
import { getTemplateWithDB } from "@utils/db";
import { getEmbeds, parseEmbedFields } from "@utils/parse";
import * as Djs from "discord.js";
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
		await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
		return;
	}
	const page = Number.isNaN(Number.parseInt(interaction.customId.replace("page", ""), 10))
		? 1
		: Number.parseInt(interaction.customId.replace("page", ""), 10);
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
		await reply(interaction, { content: ul("modals.alreadySet"), ephemeral: true });
		return;
	}
	await showStatistiqueModal(interaction, dbTemplate, statsAlreadySet, page + 1);
}

/**
 * Register the statistic in the embed when registering a new user and validate the modal
 * Also verify if the template is registered before embedding the statistics
 */
export async function pageNumber(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	db: Settings
) {
	const pageNumber = Number.parseInt(interaction.customId.replace("page", ""), 10);
	if (Number.isNaN(pageNumber)) return;
	const template = await getTemplateWithDB(interaction, db);
	if (!template) {
		await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
		return;
	}
	await embedStatistiques(
		interaction,
		template,
		pageNumber,
		db.get(interaction.guild!.id, "lang") ?? interaction.locale
	);
}
/**
 * Submit the first page when the modal is validated
 */
export async function recordFirstPage(
	interaction: Djs.ModalSubmitInteraction,
	db: Settings
) {
	if (!interaction.guild || !interaction.channel || interaction.channel.isDMBased())
		return;
	const template = await getTemplateWithDB(interaction, db);
	if (!template) return;
	await createEmbedFirstPage(interaction, template, db);
}
/**
 * Modal opened to register a new user with the name of the character and the user id
 */
export async function showFirstPageModal(
	interaction: Djs.ButtonInteraction,
	template: StatisticalTemplate,
	ul: Translation,
	havePrivate?: boolean
) {
	let nbOfPages = 1;
	if (template.statistics) {
		const nbOfStatistique = Object.keys(template.statistics).length;
		nbOfPages = Math.ceil(nbOfStatistique / 5) > 0 ? Math.ceil(nbOfStatistique / 5) : 2;
	}

	const modal = new Djs.ModalBuilder()
		.setCustomId("firstPage")
		.setTitle(ul("modals.firstPage", { page: nbOfPages + 1 }));
	const charNameInput =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("charName")
				.setLabel(ul("modals.charName.name"))
				.setPlaceholder(ul("modals.charName.description"))
				.setRequired(template.charName || false)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	const userIdInputs =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("userID")
				.setLabel(ul("modals.user.name"))
				.setPlaceholder(ul("modals.user.description"))
				.setRequired(true)
				.setValue(interaction.user.username ?? interaction.user.id)
				.setStyle(Djs.TextInputStyle.Short)
		);
	const avatarInputs =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("avatar")
				.setLabel(ul("modals.avatar.name"))
				.setPlaceholder(ul("modals.avatar.description"))
				.setRequired(false)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	const channelIdInput =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("channelId")
				.setLabel(ul("modals.channel.name"))
				.setPlaceholder(ul("modals.channel.description"))
				.setRequired(false)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	const components = [charNameInput, userIdInputs, avatarInputs, channelIdInput];
	if (havePrivate) {
		const privateInput =
			new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
				new Djs.TextInputBuilder()
					.setCustomId("private")
					.setLabel(ul("modals.private.name"))
					.setPlaceholder(ul("modals.private.description"))
					.setRequired(false)
					.setValue("")
					.setStyle(Djs.TextInputStyle.Short)
			);
		components.push(privateInput);
	}
	modal.addComponents(components);
	await interaction.showModal(modal);
}

/**
 * Open the showFirstPageModal function if the user is a moderator
 */
export async function startRegisterUser(
	interaction: Djs.ButtonInteraction,
	template: StatisticalTemplate,
	interactionUser: Djs.User,
	ul: Translation,
	havePrivate?: boolean
) {
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (isModerator) await showFirstPageModal(interaction, template, ul, havePrivate);
	else await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
}
