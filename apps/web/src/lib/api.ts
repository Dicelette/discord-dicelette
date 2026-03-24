import type { StatisticalTemplate } from "@dicelette/core";
import axios from "axios";

export type { StatisticalTemplate };

export const api = axios.create({
	baseURL: "/api",
	withCredentials: true,
});

export interface DiscordUser {
	id: string;
	username: string;
	discriminator: string;
	avatar: string | null;
	// biome-ignore lint/style/useNamingConvention: Say that to discord
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

export interface ApiGuildConfig {
	lang?: string;
	logs?: string;
	rollChannel?: string;
	disableThread?: boolean;
	hiddenRoll?: boolean | string;
	managerId?: string;
	deleteAfter?: number;
	timestamp?: boolean;
	privateChannel?: string;
	autoRole?: { dice?: string; stats?: string };
	context?: boolean;
	linkToLogs?: boolean;
	allowSelfRegister?: boolean | string;
	pity?: number;
	disableCompare?: boolean;
	sortOrder?: string;
	stripOOC?: {
		regex?: string;
		forwardId?: string;
		threadMode?: boolean;
		timer?: number;
		categoryId?: string[];
	};
	templateID?: {
		channelId: string;
		messageId: string;
		statsName: string[];
		excludedStats: string[];
		damageName: string[];
		valid?: boolean;
	};
}

export interface ApiTemplateResult {
	results: string;
	final: string;
	joinResult: string;
	format: {
		name: string;
		info: string;
		dice: string;
		originalDice: string;
		character: string;
	};
}

export interface ApiUserConfig {
	isAdmin: boolean;
	userConfig: {
		createLinkTemplate?: ApiTemplateResult;
		snippets?: Record<string, string>;
		attributes?: Record<string, number>;
	} | null;
}

export const authApi = {
	me: () => api.get<DiscordUser>("/auth/me"),
	logout: () => api.post("/auth/logout"),
	guilds: () => api.get<DiscordGuild[]>("/auth/guilds"),
	refreshGuilds: () => api.post("/auth/guilds/refresh"),
};

export const guildApi = {
	getConfig: (guildId: string) => api.get<ApiGuildConfig>(`/guilds/${guildId}/config`),
	updateConfig: (guildId: string, data: Partial<ApiGuildConfig>) =>
		api.patch(`/guilds/${guildId}/config`, data),
	getChannels: (guildId: string) => api.get(`/guilds/${guildId}/channels`),
	getRoles: (guildId: string) => api.get(`/guilds/${guildId}/roles`),
	addBot: (guildId: string) => api.get<{ url: string }>(`/guilds/${guildId}/invite`),
};

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
}

export const charactersApi = {
	getCharacters: (guildId: string) =>
		api.get<ApiCharacter[]>(`/guilds/${guildId}/characters`),
	count: (guildId: string, config?: { signal?: AbortSignal }) =>
		api.get<{ count: number }>(`/guilds/${guildId}/characters/count`, config),
	exportCsv: (guildId: string) =>
		api.get<Blob>(`/guilds/${guildId}/characters/export`, { responseType: "blob" }),
	refresh: (guildId: string) =>
		api.post<{ ok: boolean }>(`/guilds/${guildId}/characters/refresh`),
	bulkDelete: (guildId: string) =>
		api.post<{ ok: boolean }>(`/guilds/${guildId}/characters/bulk-delete`),
};

export interface TemplateImportPayload {
	template: StatisticalTemplate;
	channelId?: string;
	publicChannelId?: string;
	privateChannelId?: string;
	updateCharacters?: boolean;
	deleteCharacters?: boolean;
}

export const templateApi = {
	get: (guildId: string, config?: { signal?: AbortSignal }) =>
		api.get<StatisticalTemplate>(`/guilds/${guildId}/template`, config),
	import: (guildId: string, payload: TemplateImportPayload) =>
		api.post<{ ok: boolean }>(`/guilds/${guildId}/template`, payload),
	delete: (guildId: string) => api.delete<{ ok: boolean }>(`/guilds/${guildId}/template`),
};

export const userApi = {
	getUserConfig: (guildId: string) =>
		api.get<ApiUserConfig>(`/guilds/${guildId}/user-config`),
	updateUserConfig: (
		guildId: string,
		data: Partial<{
			snippets: Record<string, string>;
			attributes: Record<string, number>;
			createLinkTemplate: ApiTemplateResult;
		}>
	) => api.patch(`/guilds/${guildId}/user-config`, data),
	validateEntries: (
		guildId: string,
		type: "snippets" | "attributes",
		entries: Record<string, unknown>
	) =>
		api.post<ApiValidationResult>(`/guilds/${guildId}/validate-entries`, {
			type,
			entries,
		}),
};
