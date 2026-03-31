import { api } from "./client";
import type { ApiCharacter } from "./types";

export const charactersApi = {
	getCharacters: (guildId: string) =>
		api.get<ApiCharacter[]>(`/guilds/${guildId}/characters`),
	getAllCharacters: (guildId: string) =>
		api.get<ApiCharacter[]>(`/guilds/${guildId}/characters/all`),
	refreshAll: (guildId: string) =>
		api.post<{ ok: boolean }>(`/guilds/${guildId}/characters/refresh-all`),
	count: (guildId: string, config?: { signal?: AbortSignal }) =>
		api.get<{ count: number }>(`/guilds/${guildId}/characters/count`, config),
	countSelf: (guildId: string, config?: { signal?: AbortSignal }) =>
		api.get<{ count: number }>(`/guilds/${guildId}/characters/count-self`, config),
	exportCsv: (guildId: string) =>
		api.get<Blob>(`/guilds/${guildId}/characters/export`, { responseType: "blob" }),
	refresh: (guildId: string) =>
		api.post<{ ok: boolean }>(`/guilds/${guildId}/characters/refresh`),
	refreshDashboard: (guildId: string) =>
		api.post<{ ok: boolean; refreshedAll: boolean }>(
			`/guilds/${guildId}/characters/refresh-dashboard`
		),
	bulkDelete: (guildId: string) =>
		api.post<{ ok: boolean }>(`/guilds/${guildId}/characters/bulk-delete`),
};
