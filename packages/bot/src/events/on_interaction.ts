import { getInteractionContext as getLangAndConfig } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import type { StatisticalTemplate } from "@dicelette/core";
import type { Settings, Translation } from "@dicelette/types";
import { profiler } from "@dicelette/utils";
import {
	ALL_COMMANDS,
	AUTOCOMPLETE_COMMANDS,
	commandMenu,
	desktopLink,
	mobileLink,
	resetButton,
} from "commands";
import { fetchTemplate, getTemplateByInteraction } from "database";
import * as Djs from "discord.js";
import { 
	AvatarFeature, 
	MacroFeature,
	MoveFeature, 
	RenameFeature,
	StatsFeature,
	UserFeature
} from "features";
import { embedError } from "messages";
import { cancel } from "utils";
import { interactionError } from "./on_error";

export default (client: EClient): void => {
	client.on("interactionCreate", async (interaction: Djs.BaseInteraction) => {
		const cfg = getLangAndConfig(client, interaction);
		const { ul, langToUse } = cfg;
		const interactionUser = interaction.user;
		try {
			if (interaction.isMessageContextMenuCommand()) {
				await commandMenu(interaction, client);
			} else if (interaction.isChatInputCommand()) {
				const command = ALL_COMMANDS.find(
					(cmd) => cmd.data.name === interaction.commandName
				);
				if (!command) return;
				await command.execute(interaction, client);
			} else if (interaction.isAutocomplete()) {
				const autocompleteInteraction = interaction as Djs.AutocompleteInteraction;
				const command = AUTOCOMPLETE_COMMANDS.find(
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
	if (interaction.customId.includes("damageDice")) {
		const macro = new MacroFeature({ interaction, ul, interactionUser, client });
		await macro.store();
	}
	else if (interaction.customId.includes("page")) {
		const user = new UserFeature({ interaction, ul, interactionUser, client });
		await user.pageNumber();
	}
	else if (interaction.customId === "editStats") {
		const stats = new StatsFeature({ interaction, ul, interactionUser, client });
		await stats.validateByModeration();
	}
	else if (interaction.customId === "firstPage") {
		const user = new UserFeature({ interaction, ul, interactionUser, client });
		await user.firstPage();
	}
	else if (interaction.customId === "editDice") {
		const macro = new MacroFeature({ interaction, ul, interactionUser, client });
		await macro.validate();
	}
	else if (interaction.customId === "editAvatar") {
		const avatar = new AvatarFeature({
			interaction,
			ul,
			interactionUser,
		});
		await avatar.edit();
	}
	else if (interaction.customId === "rename") {
		const rename = new RenameFeature({
			interaction,
			ul,
			interactionUser,
			client,
		});
		await rename.validate();
	}
	else if (interaction.customId === "move") {
		const move = new MoveFeature({
			interaction,
			ul,
			interactionUser,
			client,
		});
		await move.validate();
	}
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
	profiler.startProfiler();
	const characters = client.characters;
	const selfRegister = client.settings.get(interaction.guild!.id, "allowSelfRegister");
	const havePrivate = !!client.settings.get(interaction.guild!.id, "privateChannel");
	
	if (interaction.customId === "register") {
		const user = new UserFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			client, 
			template,
			havePrivate,
			selfRegister 
		});
		await user.start();
	}
	else if (interaction.customId === "continue") {
		const user = new UserFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			template,
			selfRegister 
		});
		await user.continuePage();
	}
	else if (interaction.customId.includes("add_dice")) {
		const macro = new MacroFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			db: client.settings 
		});
		await macro.add();
		if (!interaction.customId.includes("first"))
			await resetButton(interaction.message, ul);
	} else if (interaction.customId === "edit_stats") {
		const stats = new StatsFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			db: client.settings 
		});
		await stats.edit();
		await resetButton(interaction.message, ul);
	} else if (interaction.customId === "validate") {
		const user = new UserFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			client, 
			template,
			characters 
		});
		await user.button();
	} else if (interaction.customId === "cancel")
		await cancel(interaction, ul, client, interactionUser);
	else if (interaction.customId === "edit_dice") {
		const macro = new MacroFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			db: client.settings 
		});
		await macro.edit();
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
		if (isMobile) await mobileLink(interaction, ul, client);
		else await desktopLink(interaction, ul, client);
		await message.edit({ components: [] });
	} else if (interaction.customId.includes("modo_stats_validation")) {
		const stats = new StatsFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			client 
		});
		await stats.couldBeValidated();
	} else if (interaction.customId.includes("modo_stats_cancel_")) {
		const stats = new StatsFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			client 
		});
		await stats.cancelStatsModeration();
	} else if (interaction.customId.includes("modo_dice_validation_")) {
		const macro = new MacroFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			client 
		});
		await macro.couldBeValidatedDice();
	} else if (interaction.customId.includes("modo_dice_cancel_")) {
		const macro = new MacroFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			client 
		});
		await macro.cancelDiceModeration();
	} else if (interaction.customId.includes("modo_dice_add_validation_")) {
		const macro = new MacroFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			client 
		});
		await macro.couldBeValidatedDiceAdd();
	} else if (interaction.customId.includes("modo_dice_add_cancel_")) {
		const macro = new MacroFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			client 
		});
		await macro.cancelDiceAddModeration();
	} else if (interaction.customId.includes("mark_as_valid")) {
		const isModerator = interaction.guild?.members.cache
			.get(interactionUser.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		if (isModerator) {
			await interaction.reply({
				content: ul("register.markAsValid"),
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		} //update the button of the message and send a DM
		const button = MacroFeature.buttons(ul, false, true);
		await interaction.message.edit({ components: [button] });
		//send the message
		const user = new UserFeature({ 
			interaction, 
			ul, 
			interactionUser, 
			client 
		});
		await user.sendValidationMessage();
		await interaction.reply({
			content: ul("register.confirm"),
			flags: Djs.MessageFlags.Ephemeral,
		});
	} else if (interaction.customId === "moderation_refuse")
		// Follow the cancel process but with another name
		await cancel(interaction, ul, client, interactionUser, true);
	else if (interaction.customId === "cancel_by_user")
		await cancel(interaction, ul, client, interactionUser, false, true);
	profiler.stopProfiler();
}

async function selectSubmit(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	profiler.startProfiler();
	if (interaction.customId === "edit_select") {
		const value = interaction.values[0];
		switch (value) {
			case "name": {
				const rename = new RenameFeature({
					interaction,
					ul,
					interactionUser,
					db,
				});
				await rename.start();
				break;
			}
			case "avatar": {
				const avatar = new AvatarFeature({
					interaction,
					ul,
					interactionUser,
					db,
				});
				await avatar.start();
				break;
			}
			case "user": {
				const move = new MoveFeature({
					interaction,
					ul,
					interactionUser,
				});
				await move.start();
				break;
			}
		}
	}
	profiler.stopProfiler();
}
