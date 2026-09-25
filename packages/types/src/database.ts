import type { Critical, CustomCritical, SortOrder } from "@dicelette/core";
import type * as Djs from "discord.js";

export interface GuildData {
	lang?: Djs.Locale;
	/** Channel ID for sheet-edit logs. */
	logs?: string;
	/** Channel where all roll results are sent. */
	rollChannel?: string;
	/** Disables thread creation for rolls (also disables the roll channel and auto-deletion). */
	disableThread?: boolean;
	/** `true` hides gmroll results (sent by DM instead); a string sends them to that channel/thread ID instead. */
	hiddenRoll?: boolean | string;
	/** Default channel for character sheets. */
	managerId?: string;
	/** Auto-deletion delay for dice results, in ms. */
	deleteAfter?: number;
	timestamp?: boolean;
	/** Default channel for private sheets. */
	privateChannel?: string;
	/** Whether the guild's userMessageId was migrated. */
	converted?: boolean;
	/** Auto role when a user is created or edited. */
	autoRole?: {
		dice?: string;
		stats?: string;
	};
	/** Adds a context link in logs, pointing to the interaction, or the prior message when auto-deletion is enabled. */
	context?: boolean;
	/** Adds a link to the log entry in the roll result. */
	linkToLogs?: boolean;
	templateID: {
		channelId: string;
		messageId: string;
		statsName: string[];
		excludedStats: string[];
		damageName: string[];
		valid?: boolean;
	};
	user: Record<string, UserGuildData[]>;
	allowSelfRegister?: boolean | string;
	stripOOC?: Partial<StripOOC>;
	/** Format used when exporting a result as text via the menu. @see LinksVariables */
	createLinkTemplate?: TemplateResult;
	pity?: number;
	/** Wraps rolls in `{}` (diceroller compare syntax); success/failure is never displayed. */
	disableCompare?: boolean;
	sortOrder?: SortOrder;
	/** Role IDs granted dashboard admin access (Administrator still works too). Dashboard-only, no effect on the bot. */
	dashboardAccess?: string[];
	/** Server-wide mathjs formula for the `[expr]` roll syntax (`$` = bracket content); takes priority over the per-user formula. */
	customFormula?: string;
}

export interface TemplateResult {
	/** Default: `{{info}} {{result}}` */
	results: string;
	/** Default: `[[{{stats}} {{results}}]](<{{link}}>)` */
	final: string;
	/** Default: `; ` */
	joinResult: string;
	format: {
		/** Format when no statistic is used. Default: `__{{stat}}__:` */
		name: string;
		/** Default: `{{info}} -` */
		info: string;
		/** Default: `{{dice}}` */
		dice: string;
		/** Default: `{{original_dice}}` */
		originalDice: string;
		/** Default: `{{character}}` */
		character: string;
	};
}

export type StripOOC = {
	regex: string;
	forwardId: string;
	threadMode: boolean;
	timer: number;
	categoryId: string[];
};

export type UserGuildData = {
	charName?: string | null;
	messageId: UserMessageId;
	damageName?: string[];
	isPrivate?: boolean;
};
/** `[messageId, channelId]` */
export type UserMessageId = [string, string];

export type PersonnageIds = { channelId: string; messageId: string };
export type UserRegistration = {
	userID: string;
	isPrivate?: boolean;
	charName?: string | null;
	damage?: string[];
	msgId: UserMessageId;
};

/** A registered user's character sheet: stats, template and dice, used to auto-fill rolls. */
export interface UserData {
	/** Falls back to the user ID if unset. */
	userName?: string | null;
	stats?: Record<string, number>;
	/** Display names for stats (non-normalized); `stats` keys stay normalized for lookups. */
	displayStats?: string[];
	/** Cached template snapshot, avoids re-fetching it for every roll. */
	template: {
		diceType?: string;
		critical?: Critical;
		customCritical?: Record<string, CustomCritical>;
	};
	/** Named damage/skill dice formulas. */
	damage?: Record<string, string>;
	private?: boolean;
	avatar?: string;
	/** Channel ID storing the character sheet message. */
	channel?: string;
	messageId?: string;
	/** True when this is a template-only placeholder, not a real registered user. */
	isFromTemplate?: boolean;
}

export type CharacterData = {
	charName?: string | null;
	messageId: UserMessageId;
	damageName?: string[];
	isPrivate?: boolean;
	userId?: string;
};

export type CharDataWithName = Record<string, CharacterData>;

export type UserDatabase = Record<string, UserData[]>;

export type CustomCriticalRoll = CustomCritical & {
	/** Set when the original value was itself a dice throw. */
	dice?: {
		originalDice: string;
		rollValue: string;
	};
};

/** Same shape as `GuildData`, but `lang` is a plain string (avoids importing discord.js in non-bot packages). */
export type ApiGuildData = Omit<GuildData, "lang"> & { lang?: string };

export type Snippets = Record<string, string>;

export type UserSettings = Record<string, UserSettingsData>;

export type UserSettingsData = {
	createLinkTemplate: TemplateResult;
	snippets?: Snippets;
	attributes?: Record<string, number | string>;
	ignoreNotfound?: string;
	/** Personal mathjs formula for the `[expr]` roll syntax; overridden by the guild's customFormula if set. */
	customFormula?: string;
	/** Timestamp (ms) of the last DM warning about a failed comment-edit sync; throttles repeat warnings. */
	commentEditWarnedAt?: number;
};

export type UserPreferences = {
	favoris?: string[];
};
