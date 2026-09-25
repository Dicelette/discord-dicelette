import { createAuthEndpoint } from "./api-builder";
import { api } from "./client";
import type { ApiFavorites, DiscordGuild, DiscordUser } from "./types";

export const authApi = {
	me: createAuthEndpoint<DiscordUser>(api, "get", "/auth/me"),
	logout: createAuthEndpoint<void>(api, "post", "/auth/logout"),
	guilds: createAuthEndpoint<DiscordGuild[]>(api, "get", "/auth/guilds"),
	refreshGuilds: createAuthEndpoint<void>(api, "post", "/auth/guilds/refresh"),
	getFavorites: createAuthEndpoint<ApiFavorites>(api, "get", "/auth/favorites"),
	updateFavorites: createAuthEndpoint<void>(api, "patch", "/auth/favorites"),
};
