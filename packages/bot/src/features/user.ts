import type { EClient } from "@dicelette/client";
import type { StatisticalTemplate } from "@dicelette/core";
import type { Characters, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { BaseFeature, type FeatureContext } from "./base";
// Import existing functions to wrap them
import * as UserRecord from "./user/record";
import * as UserShow from "./user/show_modals";
import * as UserValidation from "./user/validation";

/**
 * User feature class - handles user registration and management
 * Uses instance properties to store context and reduce parameter passing
 */
export class UserFeature extends BaseFeature {
	constructor(context: FeatureContext) {
		super(context);
	}

	/**
	 * Handles modal submission to register user statistics for a specific page
	 */
	async pageNumber(): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;
		await UserRecord.pageNumber(interaction, this.ul, this.client);
	}

	/**
	 * Handles the first page of user registration
	 */
	async firstPage(): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;
		await UserRecord.firstPage(interaction, this.client);
	}

	/**
	 * Starts user registration process
	 */
	async start(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.template) return;
		await UserShow.start(
			interaction,
			this.template,
			this.interactionUser,
			this.ul,
			this.havePrivate,
			this.selfRegister
		);
	}

	/**
	 * Continues to the next page of statistics when registering a new user
	 */
	async continuePage(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.template) return;
		await UserValidation.continuePage(
			interaction,
			this.template,
			this.ul,
			this.interactionUser,
			this.selfRegister
		);
	}

	/**
	 * Handles button interactions for user validation
	 */
	async button(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.template || !this.client || !this.characters) return;
		await UserValidation.button(
			interaction,
			this.interactionUser,
			this.template,
			this.ul,
			this.client,
			this.characters
		);
	}

	/**
	 * Sends validation message to moderators
	 */
	async sendValidationMessage(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;
		await UserValidation.sendValidationMessage(
			interaction,
			this.interactionUser,
			this.ul,
			this.client
		);
	}
}
