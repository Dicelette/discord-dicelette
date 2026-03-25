import type { StatisticalTemplate } from "@dicelette/core";
import { api } from "./client";
import type { TemplateImportPayload } from "./types";

export const templateApi = {
	get: (guildId: string, config?: { signal?: AbortSignal }) =>
		api.get<StatisticalTemplate>(`/guilds/${guildId}/template`, config),
	import: (guildId: string, payload: TemplateImportPayload) =>
		api.post<{ ok: boolean }>(`/guilds/${guildId}/template`, payload),
	delete: (guildId: string) => api.delete<{ ok: boolean }>(`/guilds/${guildId}/template`),
};
