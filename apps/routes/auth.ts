import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { Router } from "express";

const router = Router();

const DISCORD_API = "https://discord.com/api/v10";
const OAUTH_SCOPES = "identify guilds";

function clientId() {
	return process.env.DISCORD_CLIENT_ID ?? process.env.CLIENT_ID;
}
function clientSecret() {
	return process.env.DISCORD_CLIENT_SECRET ?? process.env.CLIENT_SECRET;
}
function redirectUri() {
	return process.env.DISCORD_REDIRECT_URI ?? "http://localhost:3001/api/auth/callback";
}

declare module "express-session" {
	interface SessionData {
		accessToken?: string;
		refreshToken?: string;
		userId?: string;
		user?: DiscordUser;
		oauthState?: string;
	}
}

interface DiscordUser {
	id: string;
	username: string;
	discriminator: string;
	avatar: string | null;
	global_name: string | null;
}

interface DiscordGuild {
	id: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string;
}

async function discordFetch(path: string, accessToken: string) {
	const res = await fetch(`${DISCORD_API}${path}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) throw new Error(`Discord API error: ${res.status}`);
	return res.json();
}

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
			const err = await tokenRes.text();
			console.error("Token exchange failed:", tokenRes.status, err);
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

		const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
		res.redirect(frontendUrl);
	} catch (err) {
		console.error("OAuth callback error:", err);
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

// Fix 3: only invalidate the current user's own cache, not the shared bot cache
router.post("/guilds/refresh", (req: Request, res: Response) => {
	if (!req.session.accessToken) {
		res.status(401).json({ error: "Not authenticated" });
		return;
	}
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

		const botGuildIds = await getBotGuildIds();
		const ManageGuild = BigInt(0x20);

		const filteredGuilds = userGuilds
			.filter((g) => {
				const botPresent = botGuildIds.has(g.id);
				const isAdmin = g.owner || (BigInt(g.permissions) & ManageGuild) === ManageGuild;
				return botPresent || isAdmin;
			})
			.map((g) => ({ ...g, botPresent: botGuildIds.has(g.id) }));

		res.json(filteredGuilds);
	} catch (err) {
		console.error("Guilds fetch error:", err);
		res.status(500).json({ error: "Failed to fetch guilds" });
	}
});

const userGuildCache = new Map<string, { guilds: DiscordGuild[]; expiresAt: number }>();
const USER_GUILD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let botGuildCache: { ids: Set<string>; expiresAt: number } | null = null;
const BOT_GUILD_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function getBotGuildIds(): Promise<Set<string>> {
	if (botGuildCache && Date.now() < botGuildCache.expiresAt) {
		return botGuildCache.ids;
	}
	const botToken = process.env.DISCORD_TOKEN;
	if (!botToken) return new Set();
	try {
		const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
			headers: { Authorization: `Bot ${botToken}` },
		});
		if (!res.ok) return new Set();
		const guilds = (await res.json()) as Array<{ id: string }>;
		const ids = new Set(guilds.map((g) => g.id));
		botGuildCache = { ids, expiresAt: Date.now() + BOT_GUILD_CACHE_TTL_MS };
		return ids;
	} catch {
		return new Set();
	}
}

export default router;
