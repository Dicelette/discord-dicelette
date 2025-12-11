import type { EClient } from "@dicelette/client";
import type { Settings, Translation } from "@dicelette/types";
import type * as Djs from "discord.js";

/**
 * Context interface for feature operations
 */
export interface FeatureContext {
	interaction: Djs.StringSelectMenuInteraction | Djs.ModalSubmitInteraction;
	ul: Translation;
	interactionUser: Djs.User;
	db?: Settings;
	client?: EClient;
}

/**
 * Interface for all feature implementations
 * Features should implement this interface and store context as instance properties
 */
export interface Feature {
	/**
	 * Optional method to handle string select menu interactions (start operation)
	 */
	start?(): Promise<void>;

	/**
	 * Optional method to handle modal submissions (validation operation)
	 */
	validate?(): Promise<void>;

	/**
	 * Optional method to handle button interactions (edit operation)
	 */
	edit?(): Promise<void>;
}
