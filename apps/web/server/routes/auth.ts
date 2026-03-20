import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

const DISCORD_API = "https://discord.com/api/v10";
const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI ?? "http://localhost:3001/api/auth/callback";

/** Scopes needed: identity + guilds */
const OAUTH_SCOPES = "identify guilds";

// Permissions needed for bot management (MANAGE_GUILD = 0x20)
const BOT_PERMISSIONS = "32";

declare module "express-session" {
	interface SessionData {
		accessToken?: string;
		refreshToken?: string;
		userId?: string;
		user?: DiscordUser;
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

/** Step 1: Redirect user to Discord OAuth2 */
router.get("/discord", (_req: Request, res: Response) => {
	const params = new URLSearchParams({
		client_id: CLIENT_ID,
		redirect_uri: REDIRECT_URI,
		response_type: "code",
		scope: OAUTH_SCOPES,
	});
	res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

/** Step 2: Handle OAuth2 callback */
router.get("/callback", async (req: Request, res: Response) => {
	const { code } = req.query;
	if (!code || typeof code !== "string") {
		res.status(400).json({ error: "Missing code" });
		return;
	}

	try {
		// Exchange code for tokens
		const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				grant_type: "authorization_code",
				code,
				redirect_uri: REDIRECT_URI,
			}),
		});

		if (!tokenRes.ok) {
			const err = await tokenRes.text();
			console.error("Token exchange failed:", err);
			res.status(500).json({ error: "Token exchange failed" });
			return;
		}

		const tokens = (await tokenRes.json()) as {
			access_token: string;
			refresh_token: string;
		};

		// Fetch user info
		const user = (await discordFetch("/users/@me", tokens.access_token)) as DiscordUser;

		// Store in session
		req.session.accessToken = tokens.access_token;
		req.session.refreshToken = tokens.refresh_token;
		req.session.userId = user.id;
		req.session.user = user;

		// Redirect to frontend
		const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
		res.redirect(frontendUrl);
	} catch (err) {
		console.error("OAuth callback error:", err);
		res.status(500).json({ error: "Authentication failed" });
	}
});

/** Get current user */
router.get("/me", (req: Request, res: Response) => {
	if (!req.session.user) {
		res.status(401).json({ error: "Not authenticated" });
		return;
	}
	res.json(req.session.user);
});

/** Logout */
router.post("/logout", (req: Request, res: Response) => {
	req.session.destroy(() => {
		res.json({ ok: true });
	});
});

/**
 * Get guilds where:
 * 1. The bot is present (botPresent: true)
 * 2. User is admin/manager and bot is NOT present (to allow inviting)
 */
router.get("/guilds", async (req: Request, res: Response) => {
	if (!req.session.accessToken) {
		res.status(401).json({ error: "Not authenticated" });
		return;
	}

	try {
		const userGuilds = (await discordFetch(
			"/users/@me/guilds",
			req.session.accessToken,
		)) as DiscordGuild[];

		// Guilds where the bot is present (fetched from bot token)
		const botGuildIds = await getBotGuildIds();

		// Filter: only show guilds where:
		// - Bot is present (show all, user can manage if they have manage guild perm)
		// - OR user is admin/owner (to allow bot invite)
		const MANAGE_GUILD = BigInt(0x20);

		const filteredGuilds = userGuilds
			.filter((g) => {
				const botPresent = botGuildIds.has(g.id);
				const isAdmin =
					g.owner || (BigInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD;
				return botPresent || isAdmin;
			})
			.map((g) => ({
				...g,
				botPresent: botGuildIds.has(g.id),
			}));

		res.json(filteredGuilds);
	} catch (err) {
		console.error("Guilds fetch error:", err);
		res.status(500).json({ error: "Failed to fetch guilds" });
	}
});

/** Fetch list of guild IDs where the bot is present, using the bot token */
async function getBotGuildIds(): Promise<Set<string>> {
	const botToken = process.env.DISCORD_TOKEN;
	if (!botToken) return new Set();

	try {
		const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
			headers: { Authorization: `Bot ${botToken}` },
		});
		if (!res.ok) return new Set();
		const guilds = (await res.json()) as Array<{ id: string }>;
		return new Set(guilds.map((g) => g.id));
	} catch {
		return new Set();
	}
}

export default router;
