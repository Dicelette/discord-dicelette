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
	 */
	start?(
		interaction: Djs.StringSelectMenuInteraction,
		ul: Translation,
		interactionUser: Djs.User,
		db?: Settings
	): Promise<void>;

	/**
	 * Optional method to handle button interactions
	 */
	edit?(
		interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
		ul: Translation,
		interactionUser?: Djs.User,
		dbOrClient?: Settings | EClient
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
