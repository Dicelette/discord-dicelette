import axios from "axios";

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
};
