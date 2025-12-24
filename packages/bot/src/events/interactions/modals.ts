import type { ModalHandler } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import type { Translation } from "@dicelette/types";
import type * as Djs from "discord.js";
import {
	AvatarFeature,
	MacroFeature,
	MoveFeature,
	RenameFeature,
	StatsFeature,
	UserFeature,
} from "features";

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

export async function handleModalSubmit(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	client: EClient
) {
	for (const { prefix, handler } of MODAL_PREFIX_HANDLERS) {
		if (interaction.customId.includes(prefix)) {
			await handler(interaction, ul, interactionUser, client);
			return;
		}
	}

	const handler = MODAL_HANDLERS[interaction.customId];
	if (handler) {
		await handler(interaction, ul, interactionUser, client);
	}
}
