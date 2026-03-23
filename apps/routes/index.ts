import type { Settings, TemplateData, UserSettings } from "@dicelette/types";
import { important } from "@dicelette/utils";
import cors from "cors";
import type Enmap from "enmap";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import session from "express-session";
import authRoutes from "./auth";
import { createGuildRouter } from "./guilds";

// ---------------------------------------------------------------------------
// Sliding-window rate limiter for Discord-backed API routes
// Limits each authenticated user (or IP as fallback) to RATE_MAX requests
// within a RATE_WINDOW_MS window. Excess requests get a 429.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 30; // requests per window

const rateBuckets = new Map<string, number[]>();

function slidingWindowRateLimit(req: Request, res: Response, next: NextFunction): void {
	const key = (req.session as { userId?: string }).userId ?? req.ip ?? "anon";
	const now = Date.now();
	const cutoff = now - RATE_WINDOW_MS;

	const hits = (rateBuckets.get(key) ?? []).filter((t) => t > cutoff);
	if (hits.length >= RATE_MAX) {
		const retryAfter = Math.ceil((hits[0] - cutoff) / 1000);
		res.setHeader("Retry-After", String(retryAfter));
		res.status(429).json({ error: "Too many requests, please slow down." });
		return;
	}
	hits.push(now);
	rateBuckets.set(key, hits);
	next();
}

export interface DashboardDeps {
	settings: Settings;
	userSettings: Enmap<UserSettings>;
	template: TemplateData;
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

	app.use("/api/auth", authRoutes);
	app.use("/api/guilds", slidingWindowRateLimit, createGuildRouter(deps));

	if (process.env.NODE_ENV === "production") {
		const distPath = new URL("../../../../apps/web/dist", import.meta.url).pathname;
		app.use(express.static(distPath));
		app.get("*", (_req, res) => {
			res.sendFile(
				new URL("../../../../apps/web/dist/index.html", import.meta.url).pathname
			);
		});
	}

	app.listen(Port, () => {
		important.info(`[dashboard] Server running on http://localhost:${Port}`);
	});
}
