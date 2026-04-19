import type { ApiGuildData } from "@dicelette/types";
import { createGuildEndpoint } from "./api-builder";
import type { ApiChannel, ApiRole } from "./channel-types";
import { api } from "./client";
import type { ApiDashboardBootstrap } from "./types";

export const guildApi = {
	getConfig: createGuildEndpoint<ApiGuildData>(api, "get", "/config"),
	getDashboardBootstrap: createGuildEndpoint<ApiDashboardBootstrap>(
		api,
		"get",
		"/dashboard-bootstrap"
	),
	updateConfig: createGuildEndpoint<void>(api, "patch", "/config"),
	getChannels: createGuildEndpoint<ApiChannel[]>(api, "get", "/channels"),
	getRoles: createGuildEndpoint<ApiRole[]>(api, "get", "/roles"),
	addBot: createGuildEndpoint<{ url: string }>(api, "get", "/invite"),
};
