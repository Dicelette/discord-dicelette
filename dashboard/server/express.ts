import type { DiscordUser } from "./types";

export interface JwtPayload {
	userId: string;
	user: DiscordUser;
	accessToken: string;
	refreshToken: string;
}

declare module "express" {
	interface Request {
		auth?: JwtPayload;
	}
}
