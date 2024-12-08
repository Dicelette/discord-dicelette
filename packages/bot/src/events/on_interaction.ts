import type { StatisticalTemplate } from "@dicelette/core";
import { lError, ln } from "@dicelette/localization";
import type { Characters, Settings, Translation } from "@dicelette/types";
import type { EClient } from "client";
import {
	autCompleteCmd,
	commandMenu,
	commandsList,
	desktopLink,
	mobileLink,
} from "commands";
import { resetButton } from "commands";
import { getTemplate, getTemplateWithDB } from "database";
import * as Djs from "discord.js";
import * as features from "features";
import { embedError, reply } from "messages";
import { cancel } from "utils";

export default (client: EClient): void => {
	client.on("interactionCreate", async (interaction: Djs.BaseInteraction) => {
		const langToUse =
			client.settings.get(interaction.guild!.id, "lang") ??
			interaction.guild?.preferredLocale ??
			interaction.locale;
		const ul = ln(langToUse);
		const interactionUser = interaction.user;
		try {
			if (interaction.isMessageContextMenuCommand()) {
				await commandMenu(interaction, client);
			} else if (interaction.isCommand()) {
				const command = commandsList.find(
					(cmd) => cmd.data.name === interaction.commandName
				);
				if (!command) return;
				await command.execute(interaction, client);
			} else if (interaction.isAutocomplete()) {
				const autocompleteInteraction = interaction as Djs.AutocompleteInteraction;
				const command = autCompleteCmd.find(
					(cmd) => cmd.data.name === autocompleteInteraction.commandName
				);
				if (!command) return;
				await command.autocomplete(autocompleteInteraction, client);
			} else if (interaction.isButton()) {
				let template = await getTemplate(interaction.message, client.settings);
				template = template
					? template
					: await getTemplateWithDB(interaction, client.settings);
				if (!template) {
					if (!interaction.channel || interaction.channel.isDMBased()) return;
					await (interaction.channel as Djs.TextChannel).send({
						embeds: [embedError(ul("error.noTemplate"), ul)],
					});
					return;
				}
				await buttonSubmit(
					interaction,
					ul,
					interactionUser,
					template,
					client.settings,
					client.characters
				);
			} else if (interaction.isModalSubmit())
				await modalSubmit(interaction, ul, interactionUser, client);
			else if (interaction.isStringSelectMenu())
				await selectSubmit(interaction, ul, interactionUser, client.settings);
		} catch (e) {
			console.error(e);
			if (!interaction.guild) return;
			const msgError = lError(e as Error, interaction, langToUse);
			if (msgError.length === 0) return;
			const cause = (e as Error).cause ? ((e as Error).cause as string) : undefined;
			const embed = embedError(msgError, ul, cause);
			if (
				interaction.isButton() ||
				interaction.isModalSubmit() ||
				interaction.isCommand()
			)
				await reply(interaction, { embeds: [embed] });
			if (client.settings.has(interaction.guild.id)) {
				const db = client.settings.get(interaction.guild.id, "logs");
				if (!db) return;
				const logs = (await interaction.guild.channels.fetch(
					db
				)) as Djs.GuildBasedChannel;
				if (logs instanceof Djs.TextChannel) {
					await logs.send(`\`\`\`\n${(e as Error).message}\n\`\`\``);
				}
			}
		}
	});
};

/**
 * Switch for modal submission
 * @param {Djs.ModalSubmitInteraction} interaction
 * @param ul {Translation}
 * @param interactionUser {User}
 * @param client
 */
async function modalSubmit(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	client: EClient
) {
	const db = client.settings;
	if (interaction.customId.includes("damageDice"))
		await features.storeDamageDice(interaction, ul, interactionUser, client);
	else if (interaction.customId.includes("page"))
		await features.pageNumber(interaction, ul, db);
	else if (interaction.customId === "editStats")
		await features.editStats(interaction, ul, client);
	else if (interaction.customId === "firstPage")
		await features.recordFirstPage(interaction, db);
	else if (interaction.customId === "editDice")
		await features.validateDiceEdit(interaction, ul, client);
	else if (interaction.customId === "editAvatar")
		await features.validateAvatarEdit(interaction, ul);
	else if (interaction.customId === "rename")
		await features.validateRename(interaction, ul, client);
	else if (interaction.customId === "move")
		await features.validateMove(interaction, ul, client);
}

/**
 * Switch for button interaction
 * @param interaction {Djs.ButtonInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 * @param template {StatisticalTemplate}
 * @param db
 * @param characters
 */
async function buttonSubmit(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	template: StatisticalTemplate,
	db: Settings,
	characters: Characters
) {
	if (interaction.customId === "register")
		await features.startRegisterUser(
			interaction,
			template,
			interactionUser,
			ul,
			db.has(interaction.guild!.id, "privateChannel")
		);
	else if (interaction.customId === "continue")
		await features.continuePage(interaction, template, ul, interactionUser);
	else if (interaction.customId.includes("add_dice"))
		await features.executeAddDiceButton(interaction, interactionUser, db);
	else if (interaction.customId === "edit_stats")
		await features.triggerEditStats(interaction, ul, interactionUser, db);
	else if (interaction.customId === "validate")
		await features.validateUserButton(
			interaction,
			interactionUser,
			template,
			ul,
			db,
			characters
		);
	else if (interaction.customId === "cancel")
		await cancel(interaction, ul, interactionUser);
	else if (interaction.customId === "edit_dice")
		await features.initiateDiceEdit(interaction, ul, interactionUser, db);
	else if (interaction.customId === "avatar") {
		await resetButton(interaction.message, ul);
		await interaction.reply({ content: ul("refresh"), ephemeral: true });
	} else if (interaction.customId.includes("copyResult")) {
		const isMobile = interaction.customId.includes("mobile");
		//remove button from the message
		const message = await interaction.message.fetch();
		if (isMobile) await mobileLink(interaction, ul);
		else await desktopLink(interaction, ul);
		await message.edit({ components: [] });
	}
}

async function selectSubmit(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	if (interaction.customId === "edit_select") {
		const value = interaction.values[0];
		if (value === "avatar")
			await features.initiateAvatarEdit(interaction, ul, interactionUser, db);
		else if (value === "name")
			await features.initiateRenaming(interaction, ul, interactionUser, db);
		else if (value === "user")
			await features.initiateMove(interaction, ul, interactionUser, db);
	}
}
