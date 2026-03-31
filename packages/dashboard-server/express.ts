import type { DiscordUser } from "./types";

declare module "express-session" {
	interface SessionData {
		accessToken?: string;
		refreshToken?: string;
		userId?: string;
		user?: DiscordUser;
		oauthState?: string;
	}
}
