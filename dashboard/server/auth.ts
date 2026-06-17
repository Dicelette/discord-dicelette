import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { Router } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "./express";
import { refreshRateLimit } from "./rateLimit";
import {
	type DashboardDeps,
	type DiscordGuild,
	type DiscordUser,
	OAUTH_SCOPES,
	USER_GUILD_CACHE_TTL_MS,
	userGuildCache,
} from "./types";
import {
	clientId,
	clientSecret,
	discordFetch,
	getfrontEndUrl,
	parseCookieHeader,
	redirectUri,
	requireAuth,
	userCanManageGuild,
} from "./utils";

export const AUTH_COOKIE = "auth_token";

const OAUTH_STATE_COOKIE = "oauth_state";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function setAuthCookie(
	res: Response,
	payload: JwtPayload,
	secret: string,
	secure: boolean
): void {
	const token = jwt.sign(payload, secret, { expiresIn: "7d" });
	res.cookie(AUTH_COOKIE, token, {
		httpOnly: true,
		sameSite: "lax",
		secure,
		maxAge: COOKIE_MAX_AGE,
	});
}

export function createAuthRouter(
	botGuilds: DashboardDeps["botGuilds"],
	guildEvents: import("node:events").EventEmitter,
	settings: DashboardDeps["settings"],
	userPreferences: DashboardDeps["userPreferences"],
	jwtSecret: string,
	cookieSecure: boolean
) {
	const router = Router();

	router.get("/discord", (_req: Request, res: Response) => {
		const state = randomBytes(16).toString("hex");
		res.cookie(OAUTH_STATE_COOKIE, state, {
			httpOnly: true,
			sameSite: "lax",
			secure: cookieSecure,
			maxAge: 10 * 60 * 1000,
		});
		const params = new URLSearchParams({
			client_id: clientId()!,
			redirect_uri: redirectUri(),
			response_type: "code",
			scope: OAUTH_SCOPES,
			state,
		});
		res.redirect(`https://discord.com/oauth2/authorize?${params}`);
	});

	router.get("/callback", async (req: Request, res: Response) => {
		const { code, state, error: oauthError } = req.query;

		const storedState = parseCookieHeader(req.headers.cookie, OAUTH_STATE_COOKIE);
		if (!state || typeof state !== "string" || state !== storedState) {
			res.status(400).json({ error: "Invalid OAuth state" });
			return;
		}
		// Consume the state cookie immediately so it can't be replayed
		res.clearCookie(OAUTH_STATE_COOKIE);

		if (oauthError) {
			res.redirect(
				`${getfrontEndUrl()}/login/error?reason=${encodeURIComponent(String(oauthError))}`
			);
			return;
		}

		if (!code || typeof code !== "string") {
			res.redirect(`${getfrontEndUrl()}/login/error?reason=missing_code`);
			return;
		}

		try {
			const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					client_id: clientId()!,
					client_secret: clientSecret()!,
					grant_type: "authorization_code",
					code,
					redirect_uri: redirectUri(),
				}),
			});

			if (!tokenRes.ok) {
				await tokenRes.text();
				console.error("[auth] Token exchange failed: HTTP", tokenRes.status);
				res.status(500).json({ error: "Token exchange failed" });
				return;
			}

			const tokens = (await tokenRes.json()) as {
				access_token: string;
				refresh_token: string;
			};

			const user = (await discordFetch("/users/@me", tokens.access_token)) as DiscordUser;

			setAuthCookie(
				res,
				{
					userId: user.id,
					user,
					accessToken: tokens.access_token,
					refreshToken: tokens.refresh_token,
				},
				jwtSecret,
				cookieSecure
			);

			res.redirect(getfrontEndUrl());
		} catch (err) {
			console.error(
				"[auth] OAuth callback error:",
				err instanceof Error ? err.message : String(err)
			);
			res.status(500).json({ error: "Authentication failed" });
		}
	});

	router.get("/me", (req: Request, res: Response) => {
		if (!req.auth?.user) {
			res.status(401).json({ error: "Not authenticated" });
			return;
		}
		res.json(req.auth.user);
	});

	router.post("/logout", (req: Request, res: Response) => {
		if (req.auth?.userId) userGuildCache.delete(req.auth.userId);
		res.clearCookie(AUTH_COOKIE);
		res.json({ ok: true });
	});

	router.post("/guilds/refresh", refreshRateLimit, (req: Request, res: Response) => {
		if (!req.auth?.accessToken) {
			res.status(401).json({ error: "Not authenticated" });
			return;
		}
		// Only clear this user's own guild cache — bot guild presence is provided
		// by client.guilds.cache (kept up-to-date via guildCreate/guildDelete events)
		// so no global state is affected by a single user's refresh
		if (req.auth.userId) userGuildCache.delete(req.auth.userId);
		res.json({ ok: true });
	});

	router.get("/guilds", async (req: Request, res: Response) => {
		if (!req.auth?.accessToken) {
			res.status(401).json({ error: "Not authenticated" });
			return;
		}

		try {
			const userId = req.auth.userId;
			const cached = userGuildCache.get(userId);
			const userGuilds: DiscordGuild[] =
				cached && Date.now() < cached.expiresAt
					? cached.guilds
					: await (async () => {
							const guilds = (await discordFetch(
								"/users/@me/guilds",
								req.auth!.accessToken
							)) as DiscordGuild[];
							userGuildCache.set(userId, {
								guilds,
								expiresAt: Date.now() + USER_GUILD_CACHE_TTL_MS,
							});
							return guilds;
						})();

			const ManageGuild = BigInt(0x20);

			// All guilds where the bot is present are shown (users can always
			// access their personal config). Guilds without the bot are shown
			// only if the user has ManageGuild (to offer the "add bot" flow).
			const filteredGuilds: Array<
				DiscordGuild & { botPresent: boolean; isAdmin: boolean }
			> = [];

			for (const g of userGuilds) {
				const botPresent = botGuilds.has(g.id);
				const oauthAdmin =
					g.owner || (BigInt(g.permissions) & ManageGuild) === ManageGuild;

				if (!botPresent && !oauthAdmin) continue;

				let isAdmin = oauthAdmin;
				// For bot-present guilds, also check dashboardAccess roles
				if (botPresent) {
					isAdmin = await userCanManageGuild(userId, g.id, botGuilds, settings);
				}

				filteredGuilds.push({ ...g, botPresent, isAdmin });
			}

			res.json(filteredGuilds);
		} catch (err) {
			console.error(
				"[auth] Guilds fetch error:",
				err instanceof Error ? err.message : String(err)
			);
			res.status(500).json({ error: "Failed to fetch guilds" });
		}
	});

	router.get("/favorites", requireAuth, (req: Request, res: Response) => {
		const userId = req.auth!.userId;
		const prefs = userPreferences.get(userId);
		res.json({ favoris: prefs?.favoris ?? [] });
	});

	router.patch("/favorites", requireAuth, (req: Request, res: Response) => {
		const userId = req.auth!.userId;
		const { favoris } = req.body as { favoris?: unknown };
		if (!Array.isArray(favoris) || !favoris.every((id) => typeof id === "string")) {
			res.status(400).json({ error: "Invalid favoris: expected string[]" });
			return;
		}
		userPreferences.set(userId, favoris as string[], "favoris");
		res.json({ ok: true });
	});

	router.get("/guild-events", (req: Request, res: Response) => {
		if (!req.auth?.userId) {
			res.status(401).end();
			return;
		}

		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders();

		const onGuildCreate = (guildId: string) => {
			res.write(`data: ${JSON.stringify({ guildId })}\n\n`);
		};
		guildEvents.on("guildCreate", onGuildCreate);

		const timeout = setTimeout(
			() => {
				guildEvents.off("guildCreate", onGuildCreate);
				res.end();
			},
			5 * 60 * 1000
		);

		req.on("close", () => {
			clearTimeout(timeout);
			guildEvents.off("guildCreate", onGuildCreate);
		});
	});

	return router;
}
