import type { SelectHandler } from "@dicelette/bot-helpers";
import type { Settings, Translation } from "@dicelette/types";
import { profiler } from "@dicelette/utils";
import type * as Djs from "discord.js";
import { AvatarFeature, MoveFeature, RenameFeature } from "features";

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

export async function handleSelectSubmit(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	profiler.startProfiler();
	if (interaction.customId === "edit_select") {
		const value = interaction.values[0];
		const handler = SELECT_VALUE_HANDLERS[value];
		if (handler) await handler(interaction, ul, interactionUser, db);
	}
	profiler.stopProfiler();
}
