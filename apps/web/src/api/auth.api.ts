import { api } from "./client";
import type { DiscordGuild, DiscordUser } from "./types";

export const authApi = {
	/**
	 * API: @me
	 * GET /auth/me
	 * @Servers: /apps/routes/auth.ts
	 */
	me: () => api.get<DiscordUser>("/auth/me"),
	/**
	 * @Api logout
	 * POST /auth/logout
	 * @Routes /apps/routes/auth.ts
	 */
	logout: () => api.post("/auth/logout"),
	/**
	 * @Api /auth/guilds
	 * GET /auth/guilds
	 * @Routes /apps/routes/auth.ts
	 */
	guilds: () => api.get<DiscordGuild[]>("/auth/guilds"),
	/**
	 * API: /auth/guilds/refresh
	 * POST /auth/guilds/refresh
	 * @Servers: /apps/routes/auth.ts:181
	 */
	refreshGuilds: () => api.post("/auth/guilds/refresh"),
};
