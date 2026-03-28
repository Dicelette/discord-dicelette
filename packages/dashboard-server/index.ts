import type { StatisticalTemplate } from "@dicelette/core";
import type { Characters, Settings, TemplateData, UserSettings } from "@dicelette/types";
import { important } from "@dicelette/utils";
import cors from "cors";
import type Enmap from "enmap";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { createAuthRouter } from "./auth";
import { createGuildRouter } from "./guilds";

const SessionStore = MemoryStore(session);

// ---------------------------------------------------------------------------
// Sliding-window rate limiter factory
// Creates a per-user (or per-IP as fallback) rate limiter.
// ---------------------------------------------------------------------------
export function makeRateLimit(max: number, windowMs: number) {
	const buckets = new Map<string, number[]>();
	return function rateLimit(req: Request, res: Response, next: NextFunction): void {
		const key = (req.session as { userId?: string }).userId ?? req.ip ?? "anon";
		const now = Date.now();
		const cutoff = now - windowMs;
		const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
		if (hits.length >= max) {
			const retryAfter = Math.ceil((hits[0] - cutoff) / 1000);
			res.setHeader("Retry-After", String(retryAfter));
			res.status(429).json({ error: "Too many requests, please slow down." });
			return;
		}
		hits.push(now);
		buckets.set(key, hits);
		next();
	};
}

// ---------------------------------------------------------------------------
// Minimal structural interfaces for Discord.js data exposed to routes.
// These avoid importing discord.js types in the routes package.
// ---------------------------------------------------------------------------

/** A guild member with computed effective permissions */
export interface BotMember {
	/** Returns true if the member's effective permissions include the given bitfield flag */
	hasPermission: (flag: bigint) => boolean;
}

/** A guild accessible through the bot's Discord.js client cache */
export interface BotGuild {
	/** Fetch a guild member; checks Discord.js cache first, falls back to API if needed */
	fetchMember: (userId: string) => Promise<BotMember | null>;
	/** Fetch the user's Discord profile name (global name > username) */
	fetchMemberName: (userId: string) => Promise<string | null>;
	/** All channels in the guild (all types, let the caller filter) */
	readonly channels: ReadonlyArray<{ id: string; name: string; type: number }>;
	/** All roles except @everyone */
	readonly roles: ReadonlyArray<{ id: string; name: string; color: number }>;
}

/** A Discord message with its embeds and attachments */
export interface BotMessage {
	readonly embeds: ReadonlyArray<{
		title?: string;
		thumbnail?: { url: string };
		fields?: ReadonlyArray<{ name: string; value: string }>;
	}>;
	readonly attachments: ReadonlyArray<{ filename: string; url: string }>;
}

/** Channel accessor backed by the Discord.js client cache */
export interface BotChannels {
	/** Fetch a message; checks Discord.js message cache first, falls back to API */
	fetchMessage: (channelId: string, messageId: string) => Promise<BotMessage | null>;
	/** Delete a message; returns true if deleted, false if not found or forbidden */
	deleteMessage: (channelId: string, messageId: string) => Promise<boolean>;
	/**
	 * Post the template message (embed + template.json attachment + register button) and pin it.
	 * If publicChannel is not provided and the channel supports threads, a default thread is
	 * created automatically; its id is returned as publicChannelId.
	 */
	sendTemplate: (
		channelId: string,
		template: StatisticalTemplate,
		guildId: string,
		publicChannel?: string,
		privateChannel?: string
	) => Promise<{ messageId: string; publicChannelId?: string } | null>;
}

export interface DashboardDeps {
	settings: Settings;
	userSettings: Enmap<UserSettings>;
	template: TemplateData;
	characters: Characters;
	botGuilds: {
		has: (id: string) => boolean;
		get: (id: string) => BotGuild | undefined;
	};
	botChannels: BotChannels;
	guildEvents: import("node:events").EventEmitter;
}

export function startDashboardServer(deps: DashboardDeps): void {
	const Port = process.env.DASHBOARD_PORT ?? 3001;
	const FrontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
	const isProduction = process.env.NODE_ENV === "production";

	const sessionSecret = process.env.SESSION_SECRET;
	if (!sessionSecret) {
		if (isProduction) {
			throw new Error(
				"[dashboard] SESSION_SECRET environment variable is required in production"
			);
		}
		important.warn(
			"[dashboard] SESSION_SECRET is not set — using insecure default. Set SESSION_SECRET in production!"
		);
	}

	const app = express();
	app.set("trust proxy", 1);

	// Security headers
	app.use(
		(
			_req: import("express").Request,
			res: import("express").Response,
			next: import("express").NextFunction
		) => {
			res.setHeader("X-Content-Type-Options", "nosniff");
			res.setHeader("X-Frame-Options", "DENY");
			res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
			res.setHeader("X-XSS-Protection", "0");
			next();
		}
	);

	app.use(express.json({ limit: "100kb" }));
	app.use(cors({ origin: FrontendUrl, credentials: true }));
	app.use(
		session({
			store: new SessionStore({ checkPeriod: 86_400_000 }), // prune expired entries every 24h
			secret: sessionSecret ?? "dicelette-dev-secret-change-in-prod",
			resave: false,
			saveUninitialized: false,
			cookie: {
				secure: isProduction,
				httpOnly: true,
				sameSite: "lax",
				maxAge: 7 * 24 * 60 * 60 * 1000,
			},
		})
	);

	// Auth routes: 60 req/min per user — protects Discord OAuth calls (guild list, token exchange)
	// Refresh endpoint has an additional stricter limit defined within createAuthRouter
	app.use(
		"/api/auth",
		makeRateLimit(60, 60_000),
		createAuthRouter(deps.botGuilds, deps.guildEvents)
	);
	// Guild data routes: 120 req/min per user — protects Discord.js member fetches and settings writes
	app.use("/api/guilds", makeRateLimit(120, 60_000), createGuildRouter(deps));

	if (process.env.NODE_ENV === "production") {
		const distPath = new URL("../../../apps/web/dist", import.meta.url).pathname;
		app.use(express.static(distPath));
		app.get("/{*path}", (_req, res) => {
			res.sendFile(
				new URL("../../../apps/web/dist/index.html", import.meta.url).pathname
			);
		});
	}

	app.listen(Port, () => {
		important.info(`[dashboard] Server running on http://localhost:${Port}`);
	});
}
