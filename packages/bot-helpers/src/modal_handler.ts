import type { EClient } from "@dicelette/client";
import type { StatisticalTemplate } from "@dicelette/core";
import type { Settings, Translation } from "@dicelette/types";
import type * as Djs from "discord.js";
/**
 * Type definitions for interaction handlers
 */
export type ModalHandler = (
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	client: EClient
) => Promise<void>;
export type ButtonHandler = (
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	template: StatisticalTemplate,
	client: EClient
) => Promise<void>;
export type SelectHandler = (
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) => Promise<void>;
