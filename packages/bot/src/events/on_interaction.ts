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
	UserFeature,
} from "features";
import { embedError } from "messages";
import { cancel } from "utils";
import { interactionError } from "./on_error";

/**
 * Type definitions for interaction handlers
 */
type ModalHandler = (
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	client: EClient
) => Promise<void>;

type ButtonHandler = (
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	template: StatisticalTemplate,
	client: EClient
) => Promise<void>;

type SelectHandler = (
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) => Promise<void>;

type PrefixMatcher = {
	prefix: string;
	handler: ButtonHandler;
};

/**
 * Dispatch maps for modal handlers
 */
const MODAL_HANDLERS: Record<string, ModalHandler> = {
	editAvatar: async (interaction, ul, interactionUser, _client) => {
		await new AvatarFeature({
			interaction,
			interactionUser,
			ul,
		}).edit();
	},
	editDice: async (interaction, ul, interactionUser, client) => {
		await new MacroFeature({ client, interaction, interactionUser, ul }).validate();
	},
	editStats: async (interaction, ul, interactionUser, client) => {
		await new StatsFeature({
			client,
			interaction,
			interactionUser,
			ul,
		}).validateByModeration();
	},
	firstPage: async (interaction, ul, interactionUser, client) => {
		await new UserFeature({ client, interaction, interactionUser, ul }).firstPage();
	},
	move: async (interaction, ul, interactionUser, client) => {
		await new MoveFeature({
			client,
			interaction,
			interactionUser,
			ul,
		}).validate();
	},
	rename: async (interaction, ul, interactionUser, client) => {
		await new RenameFeature({
			client,
			interaction,
			interactionUser,
			ul,
		}).validate();
	},
};

/**
 * Prefix-based modal handlers
 */
const MODAL_PREFIX_HANDLERS: { prefix: string; handler: ModalHandler }[] = [
	{
		handler: async (interaction, ul, interactionUser, client) => {
			await new MacroFeature({ client, interaction, interactionUser, ul }).store();
		},
		prefix: "damageDice",
	},
	{
		handler: async (interaction, ul, interactionUser, client) => {
			await new UserFeature({ client, interaction, interactionUser, ul }).pageNumber();
		},
		prefix: "page",
	},
];

export default (client: EClient): void => {
	client.on("interactionCreate", async (interaction: Djs.BaseInteraction) => {
		const { ul, langToUse } = getLangAndConfig(client, interaction);
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
	// Check prefix-based handlers first
	for (const { prefix, handler } of MODAL_PREFIX_HANDLERS) {
		if (interaction.customId.includes(prefix)) {
			await handler(interaction, ul, interactionUser, client);
			return;
		}
	}

	// Check exact match handlers
	const handler = MODAL_HANDLERS[interaction.customId];
	if (handler) {
		await handler(interaction, ul, interactionUser, client);
	}
}

/**
 * Dispatch maps for button handlers
 */
// biome-ignore lint/style/useNamingConvention: Object keys must match Discord customId values
const BUTTON_HANDLERS: Record<string, ButtonHandler> = {
	avatar: async (interaction, ul, _interactionUser, _template, _client) => {
		await resetButton(interaction.message, ul);
		await interaction.reply({
			content: ul("refresh"),
			flags: Djs.MessageFlags.Ephemeral,
		});
	},
	cancel: async (interaction, ul, interactionUser, _template, client) => {
		await cancel(interaction, ul, client, interactionUser);
	},
	cancel_by_user: async (interaction, ul, interactionUser, _template, client) => {
		await cancel(interaction, ul, client, interactionUser, false, true);
	},
	continue: async (interaction, ul, interactionUser, template, client) => {
		const selfRegister = client.settings.get(interaction.guild!.id, "allowSelfRegister");
		await new UserFeature({
			interaction,
			interactionUser,
			selfRegister,
			template,
			ul,
		}).continuePage();
	},
	edit_dice: async (interaction, ul, interactionUser, _template, client) => {
		await new MacroFeature({
			db: client.settings,
			interaction,
			interactionUser,
			ul,
		}).edit();
		await resetButton(interaction.message, ul);
	},
	edit_stats: async (interaction, ul, interactionUser, _template, client) => {
		await new StatsFeature({
			db: client.settings,
			interaction,
			interactionUser,
			ul,
		}).edit();
		await resetButton(interaction.message, ul);
	},
	moderation_refuse: async (interaction, ul, interactionUser, _template, client) => {
		await cancel(interaction, ul, client, interactionUser, true);
	},
	register: async (interaction, ul, interactionUser, template, client) => {
		const selfRegister = client.settings.get(interaction.guild!.id, "allowSelfRegister");
		const havePrivate = !!client.settings.get(interaction.guild!.id, "privateChannel");
		await new UserFeature({
			client,
			havePrivate,
			interaction,
			interactionUser,
			selfRegister,
			template,
			ul,
		}).start();
	},
	validate: async (interaction, ul, interactionUser, template, client) => {
		await new UserFeature({
			characters: client.characters,
			client,
			interaction,
			interactionUser,
			template,
			ul,
		}).button();
	},
};

/**
 * Prefix-based button handlers
 */
const BUTTON_PREFIX_HANDLERS: { prefix: string; handler: ButtonHandler }[] = [
	{
		handler: async (interaction, ul, interactionUser, _template, client) => {
			await new MacroFeature({
				db: client.settings,
				interaction,
				interactionUser,
				ul,
			}).add();
			if (!interaction.customId.includes("first"))
				await resetButton(interaction.message, ul);
		},
		prefix: "add_dice",
	},
	{
		handler: async (interaction, ul, _interactionUser, _template, client) => {
			const isMobile = interaction.customId.includes("mobile");
			const message = await interaction.message.fetch();
			if (isMobile) await mobileLink(interaction, ul, client);
			else await desktopLink(interaction, ul, client);
			await message.edit({ components: [] });
		},
		prefix: "copyResult",
	},
	{
		handler: async (interaction, ul, interactionUser, _template, client) => {
			await new StatsFeature({
				client,
				interaction,
				interactionUser,
				ul,
			}).couldBeValidated();
		},
		prefix: "modo_stats_validation",
	},
	{
		handler: async (interaction, ul, interactionUser, _template, client) => {
			await new StatsFeature({
				client,
				interaction,
				interactionUser,
				ul,
			}).cancelStatsModeration();
		},
		prefix: "modo_stats_cancel_",
	},
	{
		handler: async (interaction, ul, interactionUser, _template, client) => {
			await new MacroFeature({
				client,
				interaction,
				interactionUser,
				ul,
			}).couldBeValidatedDice();
		},
		prefix: "modo_dice_validation_",
	},
	{
		handler: async (interaction, ul, interactionUser, _template, client) => {
			await new MacroFeature({
				client,
				interaction,
				interactionUser,
				ul,
			}).cancelDiceModeration();
		},
		prefix: "modo_dice_cancel_",
	},
	{
		handler: async (interaction, ul, interactionUser, _template, client) => {
			await new MacroFeature({
				client,
				interaction,
				interactionUser,
				ul,
			}).couldBeValidatedDiceAdd();
		},
		prefix: "modo_dice_add_validation_",
	},
	{
		handler: async (interaction, ul, interactionUser, _template, client) => {
			await new MacroFeature({
				client,
				interaction,
				interactionUser,
				ul,
			}).cancelDiceAddModeration();
		},
		prefix: "modo_dice_add_cancel_",
	},
	{
		handler: async (interaction, ul, interactionUser, _template, client) => {
			const isModerator = interaction.guild?.members.cache
				.get(interactionUser.id)
				?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
			if (isModerator) {
				await interaction.reply({
					content: ul("register.markAsValid"),
					flags: Djs.MessageFlags.Ephemeral,
				});
				return;
			}
			const button = MacroFeature.buttons(ul, false, true);
			await interaction.message.edit({ components: [button] });
			await new UserFeature({
				client,
				interaction,
				interactionUser,
				ul,
			}).sendValidationMessage();
			await interaction.reply({
				content: ul("register.confirm"),
				flags: Djs.MessageFlags.Ephemeral,
			});
		},
		prefix: "mark_as_valid",
	},
];

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

	// Check prefix-based handlers first
	for (const { prefix, handler } of BUTTON_PREFIX_HANDLERS) {
		if (interaction.customId.includes(prefix)) {
			await handler(interaction, ul, interactionUser, template, client);
			profiler.stopProfiler();
			return;
		}
	}

	// Check exact match handlers
	const handler = BUTTON_HANDLERS[interaction.customId];
	if (handler) {
		await handler(interaction, ul, interactionUser, template, client);
	}

	profiler.stopProfiler();
}

/**
 * Dispatch map for select menu handlers
 */
const SELECT_VALUE_HANDLERS: Record<string, SelectHandler> = {
	avatar: async (interaction, ul, interactionUser, db) => {
		await new AvatarFeature({
			db,
			interaction,
			interactionUser,
			ul,
		}).start();
	},
	name: async (interaction, ul, interactionUser, db) => {
		await new RenameFeature({
			db,
			interaction,
			interactionUser,
			ul,
		}).start();
	},
	user: async (interaction, ul, interactionUser, _db) => {
		await new MoveFeature({
			interaction,
			interactionUser,
			ul,
		}).start();
	},
};

async function selectSubmit(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	profiler.startProfiler();
	if (interaction.customId === "edit_select") {
		const value = interaction.values[0];
		const handler = SELECT_VALUE_HANDLERS[value];
		if (handler) {
			await handler(interaction, ul, interactionUser, db);
		}
	}
	profiler.stopProfiler();
}
