import type { StatisticalTemplate } from "@dicelette/core";
import { createGuildEndpoint } from "./api-builder";
import { api } from "./client";

export const templateApi = {
	get: createGuildEndpoint<StatisticalTemplate | null>(api, "get", "/template"),
	import: createGuildEndpoint<{ ok: boolean }>(api, "post", "/template"),
	delete: createGuildEndpoint<{ ok: boolean }>(api, "delete", "/template"),
};
