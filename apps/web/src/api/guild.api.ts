import type { ApiGuildData } from "@dicelette/types";
import { api } from "./client";

export const guildApi = {
	getConfig: (guildId: string) => api.get<ApiGuildData>(`/guilds/${guildId}/config`),
	updateConfig: (guildId: string, data: Partial<ApiGuildData>) =>
		api.patch(`/guilds/${guildId}/config`, data),
	getChannels: (guildId: string) => api.get(`/guilds/${guildId}/channels`),
	getRoles: (guildId: string) => api.get(`/guilds/${guildId}/roles`),
	addBot: (guildId: string) => api.get<{ url: string }>(`/guilds/${guildId}/invite`),
};
