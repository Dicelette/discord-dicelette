import { api } from "./client";
import type { ApiCharacter } from "./types";

export const charactersApi = {
	getCharacters: (guildId: string) =>
		api.get<ApiCharacter[]>(`/guilds/${guildId}/characters`),
	getAllCharacters: (guildId: string) =>
		api.get<ApiCharacter[]>(`/guilds/${guildId}/characters/all`),
	count: (guildId: string, config?: { signal?: AbortSignal }) =>
		api.get<{ count: number }>(`/guilds/${guildId}/characters/count`, config),
	exportCsv: (guildId: string) =>
		api.get<Blob>(`/guilds/${guildId}/characters/export`, { responseType: "blob" }),
	refresh: (guildId: string) =>
		api.post<{ ok: boolean }>(`/guilds/${guildId}/characters/refresh`),
	bulkDelete: (guildId: string) =>
		api.post<{ ok: boolean }>(`/guilds/${guildId}/characters/bulk-delete`),
};
