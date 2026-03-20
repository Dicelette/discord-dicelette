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
	templateID?: {
		channelId: string;
		messageId: string;
		statsName: string[];
		excludedStats: string[];
		damageName: string[];
		valid?: boolean;
	};
}

export const authApi = {
	me: () => api.get<DiscordUser>("/auth/me"),
	logout: () => api.post("/auth/logout"),
	guilds: () => api.get<DiscordGuild[]>("/auth/guilds"),
};

export const guildApi = {
	getConfig: (guildId: string) => api.get<ApiGuildConfig>(`/guilds/${guildId}/config`),
	updateConfig: (guildId: string, data: Partial<ApiGuildConfig>) =>
		api.patch(`/guilds/${guildId}/config`, data),
	getChannels: (guildId: string) => api.get(`/guilds/${guildId}/channels`),
	getRoles: (guildId: string) => api.get(`/guilds/${guildId}/roles`),
	addBot: (guildId: string) => api.get<{ url: string }>(`/guilds/${guildId}/invite`),
};
