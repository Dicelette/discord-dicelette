import type { EClient } from "@dicelette/client";
import type { Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";

/**
 * Base class for all feature implementations
 * Provides common structure and utilities for feature modules
 */
export abstract class Feature {
	/**
	 * Optional method to handle string select menu interactions
	 * @param interaction - The string select menu interaction
	 * @param ul - Translation utility
	 * @param interactionUser - The user who triggered the interaction
	 * @param db - Settings database
	 */
	async start?(
		interaction: Djs.StringSelectMenuInteraction,
		ul: Translation,
		interactionUser: Djs.User,
		db: Settings
	): Promise<void>;

	/**
	 * Optional method to handle button interactions
	 * @param interaction - The button interaction
	 * @param ul - Translation utility
	 * @param interactionUser - The user who triggered the interaction
	 * @param db - Settings database
	 */
	async edit?(
		interaction: Djs.ButtonInteraction,
		ul: Translation,
		interactionUser: Djs.User,
		db: Settings
	): Promise<void>;

	/**
	 * Optional method to validate modal submissions
	 * @param interaction - The modal submit interaction
	 * @param ul - Translation utility
	 * @param client - The Discord client
	 */
	async validate?(
		interaction: Djs.ModalSubmitInteraction,
		ul: Translation,
		client: EClient
	): Promise<void>;
}
