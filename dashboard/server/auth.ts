import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { Router } from "express";
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
	redirectUri,
	userCanManageGuild,
} from "./utils";

export function createAuthRouter(
	botGuilds: DashboardDeps["botGuilds"],
	guildEvents: import("node:events").EventEmitter,
	settings: DashboardDeps["settings"]
) {
	const router = Router();

	// Fix 1: generate a random state and store it in session to prevent OAuth CSRF
	router.get("/discord", (req: Request, res: Response) => {
		const state = randomBytes(16).toString("hex");
		req.session.oauthState = state;
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
		const { code, state } = req.query;

		// Fix 1 (cont.): validate state before doing anything else
		if (!state || typeof state !== "string" || state !== req.session.oauthState) {
			res.status(400).json({ error: "Invalid OAuth state" });
			return;
		}
		// Consume the state immediately so it can't be replayed
		delete req.session.oauthState;

		if (!code || typeof code !== "string") {
			res.status(400).json({ error: "Missing code" });
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

			// Fix 2: regenerate session ID after successful login to prevent session fixation
			await new Promise<void>((resolve, reject) => {
				req.session.regenerate((err) => {
					if (err) reject(err);
					else resolve();
				});
			});

			req.session.accessToken = tokens.access_token;
			req.session.refreshToken = tokens.refresh_token;
			req.session.userId = user.id;
			req.session.user = user;

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
		if (!req.session.user) {
			res.status(401).json({ error: "Not authenticated" });
			return;
		}
		res.json(req.session.user);
	});

	router.post("/logout", (req: Request, res: Response) => {
		if (req.session.userId) userGuildCache.delete(req.session.userId);
		req.session.destroy(() => {
			res.json({ ok: true });
		});
	});

	router.post("/guilds/refresh", refreshRateLimit, (req: Request, res: Response) => {
		if (!req.session.accessToken) {
			res.status(401).json({ error: "Not authenticated" });
			return;
		}
		// Only clear this user's own guild cache — bot guild presence is provided
		// by client.guilds.cache (kept up-to-date via guildCreate/guildDelete events)
		// so no global state is affected by a single user's refresh
		if (req.session.userId) userGuildCache.delete(req.session.userId);
		res.json({ ok: true });
	});

	router.get("/guilds", async (req: Request, res: Response) => {
		if (!req.session.accessToken) {
			res.status(401).json({ error: "Not authenticated" });
			return;
		}

		try {
			const userId = req.session.userId!;
			const cached = userGuildCache.get(userId);
			const userGuilds: DiscordGuild[] =
				cached && Date.now() < cached.expiresAt
					? cached.guilds
					: await (async () => {
							const guilds = (await discordFetch(
								"/users/@me/guilds",
								req.session.accessToken!
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

	router.get("/guild-events", (req: Request, res: Response) => {
		if (!req.session.userId) {
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
