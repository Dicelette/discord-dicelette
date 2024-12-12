import type { Critical, CustomCritical } from "@dicelette/core";
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
		damageName: string[];
		valid?: boolean;
	};
	user: Record<string, UserGuildData[]>;
}

type UserGuildData = {
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
}

export type CharacterData = {
	charName?: string | null;
	messageId: UserMessageId;
	damageName?: string[];
	isPrivate?: boolean;
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
