import { api } from "./client";
import type { DiscordGuild, DiscordUser } from "./types";

export const authApi = {
	/**
	 * API: @me
	 * GET /auth/me
	 * @Server: /packages/dashboard-server/auth.ts
	 */
	me: () => api.get<DiscordUser>("/auth/me"),
	/**
	 * @Api logout
	 * POST /auth/logout
	 * @Server /packages/dashboard-server/auth.ts
	 */
	logout: () => api.post("/auth/logout"),
	/**
	 * @Api /auth/guilds
	 * GET /auth/guilds
	 * @Server /packages/dashboard-server/auth.ts
	 */
	guilds: () => api.get<DiscordGuild[]>("/auth/guilds"),
	/**
	 * API: /auth/guilds/refresh
	 * POST /auth/guilds/refresh
	 * @Server: /packages/dashboard-server/auth.ts
	 */
	refreshGuilds: () => api.post("/auth/guilds/refresh"),
};
