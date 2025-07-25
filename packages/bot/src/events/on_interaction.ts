import type { StatisticalTemplate } from "@dicelette/core";
import type { Settings, Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import {
	autCompleteCmd,
	commandMenu,
	commandsList,
	desktopLink,
	mobileLink,
	resetButton,
} from "commands";
import { fetchTemplate, getTemplateByInteraction } from "database";
import * as Djs from "discord.js";
import { Dice, Stats, User, Avatar, Move, Rename } from "features";
import { embedError, interactionError } from "messages";
import { cancel, getLangAndConfig } from "utils";

export default (client: EClient): void => {
	client.on("interactionCreate", async (interaction: Djs.BaseInteraction) => {
		const cfg = getLangAndConfig(client, interaction);
		const { ul, langToUse } = cfg;
		const interactionUser = interaction.user;
		try {
			if (interaction.isMessageContextMenuCommand()) {
				await commandMenu(interaction, client);
			} else if (interaction.isCommand()) {
				const command = commandsList.find(
					(cmd) => cmd.data.name === interaction.commandName
				);
				if (!command) return;
				await command.execute(interaction as Djs.ChatInputCommandInteraction, client);
			} else if (interaction.isAutocomplete()) {
				const autocompleteInteraction = interaction as Djs.AutocompleteInteraction;
				const command = autCompleteCmd.find(
					(cmd) => cmd.data.name === autocompleteInteraction.commandName
				);
				if (!command) return;
				await command.autocomplete(autocompleteInteraction, client);
			} else if (interaction.isButton()) {
				let template = await fetchTemplate(interaction.message, client.settings);
				template = template
					? template
					: await getTemplateByInteraction(interaction, client);
				if (!template) {
					if (!interaction.channel || interaction.channel.isDMBased()) return;
					await (interaction.channel as Djs.TextChannel).send({
						embeds: [
							embedError(
								ul("error.template.notFound", {
									guildId: interaction.guild?.name ?? interaction.guildId,
								}),
								ul
							),
						],
					});
					return;
				}
				await buttonSubmit(interaction, ul, interactionUser, template, client);
			} else if (interaction.isModalSubmit())
				await modalSubmit(interaction, ul, interactionUser, client);
			else if (interaction.isStringSelectMenu()) {
				await selectSubmit(interaction, ul, interactionUser, client.settings);
				await resetButton(interaction.message, ul);
			}
		} catch (e) {
			logger.warn(e);
			await interactionError(client, interaction, e as Error, ul, langToUse);
		}
	});
};

/**
 * Handles modal submission interactions by dispatching to the appropriate feature handler based on the modal's custom ID.
 *
 * @param interaction - The modal submission interaction to process.
 * @param ul - The translation utility for localized responses.
 * @param interactionUser - The user who submitted the modal.
 * @param client - The client instance for accessing application features and settings.
 */
async function modalSubmit(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	client: EClient
) {
	if (interaction.customId.includes("damageDice"))
		await Dice.store(interaction, ul, interactionUser, client);
	else if (interaction.customId.includes("page"))
		await User.pageNumber(interaction, ul, client);
	else if (interaction.customId === "editStats")
		await Stats.validateEdit(interaction, ul, client);
	else if (interaction.customId === "firstPage")
		await User.firstPage(interaction, client);
	else if (interaction.customId === "editDice")
		await Dice.validate(interaction, ul, client);
	else if (interaction.customId === "editAvatar") await Avatar.edit(interaction, ul);
	else if (interaction.customId === "rename")
		await Rename.validate(interaction, ul, client);
	else if (interaction.customId === "move") await Move.validate(interaction, ul, client);
}

/**
 * Switch for button interaction
 * @param {Djs.ButtonInteraction} interaction
 * @param {Translation} ul
 * @param {Djs.User} interactionUser
 * @param {StatisticalTemplate} template
 * @param {EClient} client
 */
async function buttonSubmit(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	template: StatisticalTemplate,
	client: EClient
) {
	const characters = client.characters;
	if (interaction.customId === "register")
		await User.start(
			interaction,
			template,
			interactionUser,
			ul,
			!!client.settings.get(interaction.guild!.id, "privateChannel"),
			client.settings.get(interaction.guild!.id, "allowSelfRegister")
		);
	else if (interaction.customId === "continue")
		await User.continuePage(
			interaction,
			template,
			ul,
			interactionUser,
			client.settings.get(interaction.guild!.id, "allowSelfRegister")
		);
	else if (interaction.customId.includes("add_dice")) {
		await Dice.add(interaction, interactionUser, client.settings);
		if (!interaction.customId.includes("first"))
			await resetButton(interaction.message, ul);
	} else if (interaction.customId === "edit_stats") {
		await Stats.edit(interaction, ul, interactionUser, client.settings);
		await resetButton(interaction.message, ul);
	} else if (interaction.customId === "validate") {
		await User.button(interaction, interactionUser, template, ul, client, characters);
	} else if (interaction.customId === "cancel")
		await cancel(interaction, ul, interactionUser);
	else if (interaction.customId === "edit_dice") {
		await Dice.edit(interaction, ul, interactionUser, client.settings);
		await resetButton(interaction.message, ul);
	} else if (interaction.customId === "avatar") {
		await resetButton(interaction.message, ul);
		await interaction.reply({
			content: ul("refresh"),
			flags: Djs.MessageFlags.Ephemeral,
		});
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
		switch (value) {
			case "name":
				await Rename.start(interaction, ul, interactionUser, db);
				break;
			case "avatar":
				await Avatar.start(interaction, ul, interactionUser, db);
				break;
			case "user":
				await Move.start(interaction, ul, interactionUser, db);
				break;
		}
	}
}
