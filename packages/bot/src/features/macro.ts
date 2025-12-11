import type { EClient } from "@dicelette/client";
import type { Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { BaseFeature, type FeatureContext } from "./base";
// Import existing functions to wrap them
import * as MacroRecord from "./macro/record";
import * as MacroShow from "./macro/show_modals";
import * as MacroValidation from "./macro/validation";

/**
 * Macro feature class - handles dice macro management
 * Uses instance properties to store context and reduce parameter passing
 */
export class MacroFeature extends BaseFeature {
	constructor(context: FeatureContext) {
		super(context);
	}

	/**
	 * Stores a dice macro from modal submission
	 */
	async store(): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;
		await MacroRecord.store(interaction, this.ul, this.interactionUser, this.client);
	}

	/**
	 * Shows modal to add a new dice macro
	 */
	async add(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.db) return;
		await MacroShow.add(interaction, this.interactionUser, this.db);
	}

	/**
	 * Shows modal to edit an existing dice macro
	 */
	async edit(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.db) return;
		await MacroShow.edit(interaction, this.ul, this.interactionUser, this.db);
	}

	/**
	 * Validates a dice macro submission
	 */
	async validate(): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;
		await MacroValidation.validate(interaction, this.ul, this.client);
	}

	/**
	 * Handles validation button for dice moderation
	 */
	async couldBeValidatedDice(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;
		await MacroValidation.couldBeValidatedDice(interaction, this.ul, this.client);
	}

	/**
	 * Handles cancel button for dice moderation
	 */
	async cancelDiceModeration(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;
		await MacroValidation.cancelDiceModeration(interaction, this.ul, this.client);
	}

	/**
	 * Handles validation button for dice add moderation
	 */
	async couldBeValidatedDiceAdd(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;
		await MacroValidation.couldBeValidatedDiceAdd(interaction, this.ul, this.client);
	}

	/**
	 * Handles cancel button for dice add moderation
	 */
	async cancelDiceAddModeration(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;
		await MacroValidation.cancelDiceAddModeration(interaction, this.ul, this.client);
	}

	/**
	 * Static method: Returns action row buttons for macro registration
	 * This is a utility function that doesn't require instance state
	 */
	static buttons(ul: Translation, markAsValidated = false, moderationSent = false): Djs.ActionRowBuilder<Djs.ButtonBuilder> {
		return MacroRecord.buttons(ul, markAsValidated, moderationSent);
	}
}
