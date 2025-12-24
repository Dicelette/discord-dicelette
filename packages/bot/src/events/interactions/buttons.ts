import type { ButtonHandler } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import type { StatisticalTemplate } from "@dicelette/core";
import type { Translation } from "@dicelette/types";
import { profiler } from "@dicelette/utils";
import { desktopLink, mobileLink, resetButton } from "commands";
import * as Djs from "discord.js";
import { MacroFeature, StatsFeature, UserFeature } from "features";
import { cancel } from "utils";

/**
 * Dispatch maps for button handlers
 */
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
	// biome-ignore lint/style/useNamingConvention: Must match customId discord
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
	// biome-ignore lint/style/useNamingConvention: Must match customId discord
	edit_dice: async (interaction, ul, interactionUser, _template, client) => {
		await new MacroFeature({
			db: client.settings,
			interaction,
			interactionUser,
			ul,
		}).edit();
		await resetButton(interaction.message, ul);
	},
	// biome-ignore lint/style/useNamingConvention: Must match customId discord
	edit_stats: async (interaction, ul, interactionUser, _template, client) => {
		await new StatsFeature({
			db: client.settings,
			interaction,
			interactionUser,
			ul,
		}).edit();
		await resetButton(interaction.message, ul);
	},
	// biome-ignore lint/style/useNamingConvention: Must match customId discord
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

export async function handleButtonSubmit(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	template: StatisticalTemplate,
	client: EClient
) {
	profiler.startProfiler();

	for (const { prefix, handler } of BUTTON_PREFIX_HANDLERS) {
		if (interaction.customId.startsWith(prefix)) {
			await handler(interaction, ul, interactionUser, template, client);
			profiler.stopProfiler();
			return;
		}
	}

	const handler = BUTTON_HANDLERS[interaction.customId];
	if (handler) await handler(interaction, ul, interactionUser, template, client);

	profiler.stopProfiler();
}
