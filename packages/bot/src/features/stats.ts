import type { EClient } from "@dicelette/client";
import type { StatisticalTemplate } from "@dicelette/core";
import type { Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { BaseFeature, type FeatureContext } from "./base";
// Import existing functions to wrap them
import * as StatsShow from "./stats/show_modals";
import * as StatsValidation from "./stats/validation";

/**
 * Stats feature class - handles character statistics management
 * Uses instance properties to store context and reduce parameter passing
 */
export class StatsFeature extends BaseFeature {
	constructor(context: FeatureContext) {
		super(context);
	}

	/**
	 * Shows modal to display statistics when adding a new user
	 */
	async show(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.template) return;
		const stats = this.template.statistics ? Object.keys(this.template.statistics) : undefined;
		const page = 1; // Default page
		const moderation = false; // Default moderation
		await StatsShow.show(interaction, this.template, stats, page, moderation);
	}

	/**
	 * Shows modal to edit existing statistics
	 */
	async edit(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.db) return;
		await StatsShow.edit(interaction, this.ul, this.interactionUser, this.db);
	}

	/**
	 * Registers new statistics from modal submission
	 */
	async register(): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;
		await StatsValidation.register(interaction, this.ul, this.client);
	}

	/**
	 * Validates and updates user statistics from modal submission
	 */
	async validateEdit(): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;
		await StatsValidation.validateEdit(interaction, this.ul, this.client);
	}

	/**
	 * Validates statistics by moderation
	 */
	async validateByModeration(): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;
		await StatsValidation.validateByModeration(interaction, this.ul, this.client);
	}

	/**
	 * Handles validation button for stats moderation
	 */
	async couldBeValidated(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;
		await StatsValidation.couldBeValidated(
			interaction,
			this.ul,
			this.client,
			this.interactionUser
		);
	}

	/**
	 * Handles cancel button for stats moderation
	 */
	async cancelStatsModeration(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;
		await StatsValidation.cancelStatsModeration(interaction, this.ul, this.client);
	}
}
