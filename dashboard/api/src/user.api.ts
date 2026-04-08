import type { UserSettingsData } from "@dicelette/types";
import { api } from "./client";
import type { ApiUserConfig, ApiValidationResult } from "./types";

export const userApi = {
	getUserConfig: (guildId: string) =>
		api.get<ApiUserConfig>(`/guilds/${guildId}/user-config`),
	updateUserConfig: (guildId: string, data: Partial<UserSettingsData>) =>
		api.patch(`/guilds/${guildId}/user-config`, data),
	validateEntries: (
		guildId: string,
		type: "snippets" | "attributes",
		entries: Record<string, unknown>,
		attributes?: Record<string, number>,
		replaceUnknown?: string
	) =>
		api.post<ApiValidationResult>(`/guilds/${guildId}/validate-entries`, {
			type,
			entries,
			attributes,
			ignoreNotfound: replaceUnknown,
		}),
};
