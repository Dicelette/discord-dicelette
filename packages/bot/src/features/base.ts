import type { EClient } from "@dicelette/client";
import type { Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";

/**
 * Interface for feature implementations
 * Defines the contract for feature modules without imposing implementation details
 */
export interface IFeature {
	/**
	 * Optional method to handle string select menu interactions
	 * Note: db parameter is optional as not all features require it (e.g., Move)
	 */
	start?(
		interaction: Djs.StringSelectMenuInteraction,
		ul: Translation,
		interactionUser: Djs.User,
		db?: Settings
	): Promise<void>;

	/**
	 * Optional method to handle modal submissions (Avatar uses this for edit)
	 */
	edit?(
		interaction: Djs.ModalSubmitInteraction,
		ul: Translation
	): Promise<void>;

	/**
	 * Optional method to validate modal submissions
	 */
	validate?(
		interaction: Djs.ModalSubmitInteraction,
		ul: Translation,
		client: EClient
	): Promise<void>;
}
