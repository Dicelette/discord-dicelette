import { api } from "./client";
import type { DiscordGuild, DiscordUser } from "./types";

export const authApi = {
	me: () => api.get<DiscordUser>("/auth/me"),
	logout: () => api.post("/auth/logout"),
	guilds: () => api.get<DiscordGuild[]>("/auth/guilds"),
	refreshGuilds: () => api.post("/auth/guilds/refresh"),
};
