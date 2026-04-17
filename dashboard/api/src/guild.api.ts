import { createGuildEndpoint } from "./api-builder";
import type { ApiGuildData } from "@dicelette/types";
import type { ApiChannel, ApiRole } from "./channel-types";
import { api } from "./client";

export const guildApi = {
	getConfig: createGuildEndpoint<ApiGuildData>(api, "get", "/config"),
	updateConfig: createGuildEndpoint<void>(api, "patch", "/config"),
	getChannels: createGuildEndpoint<ApiChannel[]>(api, "get", "/channels"),
	getRoles: createGuildEndpoint<ApiRole[]>(api, "get", "/roles"),
	addBot: createGuildEndpoint<{ url: string }>(api, "get", "/invite"),
};
