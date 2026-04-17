import { createGuildEndpoint } from "./api-builder";
import { api } from "./client";
import type { ApiCharacter } from "./types";

export const charactersApi = {
	getCharacters: createGuildEndpoint<ApiCharacter[]>(api, "get", "/characters"),
	getAllCharacters: createGuildEndpoint<ApiCharacter[]>(api, "get", "/characters/all"),
	refreshAll: createGuildEndpoint<{ ok: boolean }>(api, "post", "/characters/refresh-all"),
	count: createGuildEndpoint<{ count: number }>(api, "get", "/characters/count"),
	countSelf: createGuildEndpoint<{ count: number }>(api, "get", "/characters/count-self"),
	exportCsv: createGuildEndpoint<Blob>(api, "get", "/characters/export", "blob"),
	refresh: createGuildEndpoint<{ ok: boolean }>(api, "post", "/characters/refresh"),
	refreshDashboard: createGuildEndpoint<{ ok: boolean; refreshedAll: boolean }>(
		api,
		"post",
		"/characters/refresh-dashboard"
	),
	bulkDelete: createGuildEndpoint<{ ok: boolean }>(api, "post", "/characters/bulk-delete"),
};
