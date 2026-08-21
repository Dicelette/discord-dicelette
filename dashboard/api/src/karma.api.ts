import { createGuildEndpoint } from "./api-builder";
import { api } from "./client";
import type { ApiKarmaEntry, ApiKarmaOverview } from "./types";

export const karmaApi = {
	getOverview: createGuildEndpoint<ApiKarmaOverview>(api, "get", "/karma"),
	getPublicKarma: (guildId: string, userId: string) =>
		api.get<ApiKarmaEntry>(`/guilds/${guildId}/karma/public/${userId}`),
};
