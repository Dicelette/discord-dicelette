import type { StatisticalTemplate } from "@dicelette/core";
import type { ApiGuildData, UserSettingsData } from "@dicelette/types";
import type { ApiChannel, ApiRole } from "./channel-types";

export interface DiscordUser {
	id: string;
	username: string;
	discriminator: string;
	avatar: string | null;
	global_name: string | null;
}

export interface DiscordGuild {
	id: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string;
	/** true = bot is in this guild */
	botPresent: boolean;
	/** true = user has admin access to the dashboard for this guild */
	isAdmin: boolean;
}

export interface ApiUserConfig {
	isAdmin: boolean;
	/** true = user has strict Discord Administrator permission */
	isStrictAdmin: boolean;
	userConfig: Partial<UserSettingsData> | null;
}

export type { ApiGuildData, StatisticalTemplate, UserSettingsData };

export interface ApiValidationResult {
	valid: Record<string, string | number>;
	errors: Record<string, string>;
}

export interface ApiFavorites {
	favoris: string[];
}

export interface ApiCharacterField {
	name: string;
	value: string;
}

export interface ApiCharacter {
	charName: string | null;
	messageId: string;
	channelId: string;
	discordLink: string;
	canLink: boolean;
	isPrivate: boolean;
	avatar: string | null;
	stats: ApiCharacterField[] | null;
	damage: ApiCharacterField[] | null;
	/** Only present in admin server-wide character list */
	userId?: string;
	/** Discord handle (@username) of the owner — only present in admin server-wide character list */
	ownerName?: string;
}

export interface TemplateImportPayload {
	template: StatisticalTemplate;
	channelId?: string;
	publicChannelId?: string;
	privateChannelId?: string;
	updateCharacters?: boolean;
	deleteCharacters?: boolean;
}

export interface ApiDashboardBootstrap {
	isAdmin: boolean;
	isStrictAdmin: boolean;
	userConfig: Partial<UserSettingsData> | null;
	userCharCount: number;
	serverCharCount: number;
	config: ApiGuildData | null;
	channels: ApiChannel[];
	roles: ApiRole[];
	/** Guild display name — `null` when the bot is no longer in the guild */
	guildName: string | null;
	/** Guild icon hash — `null` when the guild has no icon or the bot is no longer in it */
	guildIcon: string | null;
}
