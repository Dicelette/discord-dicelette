import { createGuildEndpoint } from "./api-builder";
import { api } from "./client";
import type { ApiKarmaEntry, ApiKarmaLeaderboard, ApiKarmaOverview } from "./types";

export const karmaApi = {
	getOverview: createGuildEndpoint<ApiKarmaOverview>(api, "get", "/karma"),
	getPublicKarma: (guildId: string, userId: string) =>
		api.get<ApiKarmaEntry>(`/guilds/${guildId}/karma/public/${userId}`),
	getPublicLeaderboard: (guildId: string) =>
		api.get<ApiKarmaLeaderboard>(`/guilds/${guildId}/karma/public`),
	resetSelf: createGuildEndpoint<{ ok: boolean }>(api, "post", "/karma/reset"),
	resetUser: (guildId: string, userId: string) =>
		api.post<{ ok: boolean }>(`/guilds/${guildId}/karma/reset/${userId}`),
};
