import type { StatisticalTemplate } from "@dicelette/core";
import type { ApiGuildData, UserSettingsData } from "@dicelette/types";

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
}

export interface ApiUserConfig {
	isAdmin: boolean;
	userConfig: Partial<UserSettingsData> | null;
}

export type { ApiGuildData, StatisticalTemplate, UserSettingsData };

export interface ApiValidationResult {
	valid: Record<string, string | number>;
	errors: Record<string, string>;
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
}

export interface TemplateImportPayload {
	template: StatisticalTemplate;
	channelId?: string;
	publicChannelId?: string;
	privateChannelId?: string;
	updateCharacters?: boolean;
	deleteCharacters?: boolean;
}
