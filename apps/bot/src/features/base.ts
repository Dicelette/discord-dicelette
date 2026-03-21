import type { EClient } from "@dicelette/client";
import type { StatisticalTemplate } from "@dicelette/core";
import type { Characters, Settings, Translation } from "@dicelette/types";
import type * as Djs from "discord.js";

/**
 * Context object containing common dependencies for feature operations
 * Extended to support more complex feature requirements
 */
export interface FeatureContext {
	interaction: Djs.BaseInteraction;
	ul: Translation;
	interactionUser: Djs.User;
	db?: Settings;
	client?: EClient;
	// Extended properties for complex features
	template?: StatisticalTemplate;
	characters?: Characters;
	havePrivate?: boolean;
	selfRegister?: boolean | string;
}

/**
 * Base class for features with context management
 * Stores common dependencies as instance properties
 */
export abstract class BaseFeature {
	protected interaction: Djs.BaseInteraction;
	protected ul: Translation;
	protected interactionUser: Djs.User;
	protected db?: Settings;
	protected client?: EClient;
	// Extended properties for complex features
	protected template?: StatisticalTemplate;
	protected characters?: Characters;
	protected havePrivate?: boolean;
	protected selfRegister?: boolean | string;

	constructor(context: FeatureContext) {
		this.interaction = context.interaction;
		this.ul = context.ul;
		this.interactionUser = context.interactionUser;
		this.db = context.db;
		this.client = context.client;
		this.template = context.template;
		this.characters = context.characters;
		this.havePrivate = context.havePrivate;
		this.selfRegister = context.selfRegister;
	}
}
