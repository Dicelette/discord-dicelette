import { createGuildEndpoint } from "./api-builder";
import type { UserSettingsData } from "@dicelette/types";
import { api } from "./client";
import type { ApiUserConfig, ApiValidationResult } from "./types";

const getUserConfig = createGuildEndpoint<ApiUserConfig>(api, "get", "/user-config");
const updateUserConfig = createGuildEndpoint<void>(api, "patch", "/user-config");
const validateEntriesRaw = createGuildEndpoint<ApiValidationResult>(api, "post", "/validate-entries");

export const userApi = {
	getUserConfig,
	updateUserConfig,
	validateEntries: (
		guildId: string,
		type: "snippets" | "attributes",
		entries: Record<string, unknown>,
		attributes?: Record<string, number | string>,
		replaceUnknown?: string
	) =>
		validateEntriesRaw(guildId, {
			type,
			entries,
			attributes,
			ignoreNotfound: replaceUnknown,
		}),
};
