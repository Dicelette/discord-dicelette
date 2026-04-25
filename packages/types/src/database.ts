import type { Critical, CustomCritical, SortOrder } from "@dicelette/core";
import type * as Djs from "discord.js";

export interface GuildData {
	/**
	 * Language to use with the bot
	 */
	lang?: Djs.Locale;
	/**
	 * Save a channel to send every long related to the sheet edit
	 */
	logs?: string;
	/**
	 * Allow to send every result into a specific channel
	 */
	rollChannel?: string;
	/**
	 * Disable the thread creation for roll
	 * - Disable roll channel
	 * - Disable the auto deletion
	 */
	disableThread?: boolean;
	/**
	 * Hidden channel or result for mj roll
	 * If true => hide result, doesn't send logs ; result are send in DM
	 * if string => channel/thread.id where result will be send
	 * In all cases; result are hidden in the channel when used (unless used in configured channel)
	 */
	hiddenRoll?: boolean | string;
	/**
	 * The default channel for the character sheet
	 */
	managerId?: string;
	/**
	 * Disable the auto deletion of the dice result
	 * Registered in ms
	 */
	deleteAfter?: number;
	/**
	 * Add a timestamp to the log result
	 */
	timestamp?: boolean;
	/**
	 * Private chan for private sheet (default)
	 */
	privateChannel?: string;
	/**
	 * If the guild was converted for the userMessageId
	 */
	converted?: boolean;
	/**
	 * Auto role when a user is created or edited
	 */
	autoRole?: {
		dice?: string;
		stats?: string;
	};
	/**
	 * In the logs, add a context link to the message. The link will change depending of the auto deletion:
	 * - If disabled, the link will be the result interaction
	 * - If enabled, the link will be the message before the interaction
	 */
	context?: boolean;
	/**
	 * In the result dice interaction, add a link to the logs receipt
	 */
	linkToLogs?: boolean;
	/**
	 * The template ID for the guild
	 */
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
	/**
	 * If set, will take that format when using the menu to export the result as text
	 * @defaultValue `[[__{{stats}}__: **{{info}}** — {{result}}]](<{{link}}>)`
	 * @see LinksVariables
	 */
	createLinkTemplate?: TemplateResult;
	pity?: number;
	/**
	 * If enabled, all dice throw will be encapsulated with `{}` to match the diceroller library
	 * The Fail/Success won't never be displayed.
	 * @default false
	 */
	disableCompare?: boolean;
	/**
	 * Sort output results
	 * @default undefined
	 */
	sortOrder?: SortOrder;
	/**
	 * List of role IDs that grant access to the dashboard admin panel.
	 * When set (non-empty), only users with one of these roles can access admin config.
	 * ManageGuild permission alone is no longer sufficient; Administrator still works.
	 * Dashboard-only setting — has no effect on the Discord bot itself.
	 */
	dashboardAccess?: string[];
}

export interface TemplateResult {
	/**
	 * @default {{info}} {{result}}
	 */
	results: string;
	/**
	 * @default [[{{stats}} {{results}}]](<{{link}}>)
	 */
	final: string;
	/*
	 * @default: `; `
	 */
	joinResult: string;
	format: {
		/**
		 * The format to use when no statistics is used
		 * @default __{{stat}}__:
		 */
		name: string;
		/**
		 * @default {{info}} -
		 */
		info: string;
		/**
		 * @default {{dice}}
		 */
		dice: string;
		/*
		 * @default {{original_dice}}
		 */
		originalDice: string;
		/*
		 * @default {{character}}
		 */
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
/**
 * `[messageId, channelId]`
 */
export type UserMessageId = [string, string];

export type PersonnageIds = { channelId: string; messageId: string };
export type UserRegistration = {
	userID: string;
	isPrivate?: boolean;
	charName?: string | null;
	damage?: string[];
	msgId: UserMessageId;
};

/**
 * When a user is registered, a message will be sent in the corresponding channel for the template
 * When any user roll on a statistique:
 * - The bot will check the user in the database.
 * - If it is, it will get the message with the statistique attached:
 * 	- The bot will get the content of the JSON file and parse it to get the statistique of the user
 * 	- Using it, it will roll normally and send the result to the user
 * - If the user doesn't exists or their stat was deleted: the bot will send a message to inform the user that he is not registered and roll normally, ignoring the statistique/characters (theses will be send into the comments part)
 */
export interface UserData {
	/** by default, will be the id of the user, if changed to a string, it will be used */
	userName?: string | null;
	/** The statistics as value */
	stats?: Record<string, number>;
	/**
	 * Display names for stats (non-normalized), deduplicated by normalized key.
	 * Used for UI/info rendering while `stats` remains normalized for lookups.
	 */
	displayStats?: string[];
	/**
	 * Allow to prevent returning each time to the JSON template for roll
	 */
	template: {
		diceType?: string;
		critical?: Critical;
		customCritical?: Record<string, CustomCritical>;
	};
	/**
	 * The skill dice that the user can do
	 */
	damage?: Record<string, string>;
	/**
	 * If the character is private or not
	 */
	private?: boolean;
	/**
	 * Thumbnail of the user, if exists
	 */
	avatar?: string;
	/**
	 * The channelID where the message is stored
	 */
	channel?: string;
	/**
	 * Message ID of the user data
	 */
	messageId?: string;
	/**
	 * Useful to know if it's a userData created from the template and not an actual user data
	 */
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
	/**
	 * If the original value is a dice throw, set the result of the dice here
	 */
	dice?: {
		/**
		 * The original dice throw
		 */
		originalDice: string;
		/**
		 * The result of the dice throw
		 */
		rollValue: string;
	};
};

/**
 * API-serialized version of GuildData: identical structure but `lang` is a plain string
 * (avoids importing discord.js `Locale` enum in non-bot packages).
 */
export type ApiGuildData = Omit<GuildData, "lang"> & { lang?: string };

export type Snippets = Record<string, string>;

export type UserSettings = Record<string, UserSettingsData>;

export type UserSettingsData = {
	createLinkTemplate: TemplateResult;
	snippets?: Snippets;
	attributes?: Record<string, number | string>;
	ignoreNotfound?: string;
};

export type UserPreferences = {
	favoris?: string[];
};
