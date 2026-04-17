import { createGuildEndpoint } from "./api-builder";
import type { StatisticalTemplate } from "@dicelette/core";
import { api } from "./client";
import type { TemplateImportPayload } from "./types";

export const templateApi = {
	get: createGuildEndpoint<StatisticalTemplate | null>(api, "get", "/template"),
	import: createGuildEndpoint<{ ok: boolean }>(api, "post", "/template"),
	delete: createGuildEndpoint<{ ok: boolean }>(api, "delete", "/template"),
};
