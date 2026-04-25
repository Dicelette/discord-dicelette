import { createAuthEndpoint } from "./api-builder";
import { api } from "./client";
import type { ApiFavorites, DiscordGuild, DiscordUser } from "./types";

export const authApi = {
	/** API: @me - GET /auth/me */
	me: createAuthEndpoint<DiscordUser>(api, "get", "/auth/me"),
	/** API: logout - POST /auth/logout */
	logout: createAuthEndpoint<void>(api, "post", "/auth/logout"),
	/** API: /auth/guilds - GET /auth/guilds */
	guilds: createAuthEndpoint<DiscordGuild[]>(api, "get", "/auth/guilds"),
	/** API: /auth/guilds/refresh - POST /auth/guilds/refresh */
	refreshGuilds: createAuthEndpoint<void>(api, "post", "/auth/guilds/refresh"),
	/** API: /auth/favorites - GET */
	getFavorites: createAuthEndpoint<ApiFavorites>(api, "get", "/auth/favorites"),
	/** API: /auth/favorites - PATCH */
	updateFavorites: createAuthEndpoint<void>(api, "patch", "/auth/favorites"),
};
