import { fileURLToPath } from "node:url";
import { important } from "@dicelette/utils";
import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { createAuthRouter } from "./auth";
import { createGuildRouter } from "./guilds";
import { makeRateLimit } from "./rateLimit";
import type { DashboardDeps } from "./types";

const SessionStore = MemoryStore(session);

// ---------------------------------------------------------------------------
// Minimal structural interfaces for Discord.js data exposed to routes.
// These avoid importing discord.js types in the routes package.
// ---------------------------------------------------------------------------

export function startDashboardServer(deps: DashboardDeps): void {
	const Port = process.env.DASHBOARD_PORT ?? 3001;
	const FrontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
	const isProduction = process.env.NODE_ENV === "production";
	const frontendHostname = (() => {
		try {
			return new URL(FrontendUrl).hostname;
		} catch {
			return "";
		}
	})();
	const isLocalhostFrontend =
		frontendHostname === "localhost" || frontendHostname === "127.0.0.1";
	const sessionCookieSecure = isProduction && !isLocalhostFrontend;

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
			if (isProduction) {
				res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
			}
			res.setHeader(
				"Content-Security-Policy",
				[
					"default-src 'self'",
					"connect-src 'self' https://discord.com",
					"img-src 'self' data: https:",
					"script-src 'self'",
					"style-src 'self' 'unsafe-inline'",
					"font-src 'self' data:",
					"frame-ancestors 'none'",
				].join("; ")
			);
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
				// Keep secure cookies in real prod, but allow local prod-like tests on http://localhost.
				secure: sessionCookieSecure,
				httpOnly: true,
				sameSite: "lax",
				maxAge: 7 * 24 * 60 * 60 * 1000,
			},
		})
	);

	// CSRF: reject state-changing requests originating from unexpected origins.
	// Same-origin requests from the SPA always carry a matching Origin header.
	// Non-browser clients (monitoring, server-to-server) typically omit Origin and are allowed through.
	const allowedOrigin = (() => {
		try {
			return new URL(FrontendUrl).origin;
		} catch {
			return FrontendUrl;
		}
	})();
	app.use((req: Request, res: Response, next: NextFunction): void => {
		const safeMethods = ["GET", "HEAD", "OPTIONS"];
		if (safeMethods.includes(req.method)) {
			next();
			return;
		}
		const origin = req.get("Origin");
		if (!origin) {
			next();
			return;
		}
		let requestOrigin: string;
		try {
			requestOrigin = new URL(origin).origin;
		} catch {
			res.status(403).json({ error: "Forbidden" });
			return;
		}
		if (requestOrigin !== allowedOrigin) {
			res.status(403).json({ error: "Forbidden" });
			return;
		}
		next();
	});

	// Auth routes: 60 req/min per user — protects Discord OAuth calls (guild list, token exchange)
	// Refresh endpoint has an additional stricter limit defined within createAuthRouter
	app.use(
		"/api/auth",
		makeRateLimit(60, 60_000),
		createAuthRouter(deps.botGuilds, deps.guildEvents, deps.settings)
	);
	// Guild data routes: 120 req/min per user for reads, 30 req/min for writes (POST/PATCH/DELETE)
	app.use("/api/guilds", (req: Request, res: Response, next: NextFunction) => {
		const isWrite = ["POST", "PATCH", "DELETE"].includes(req.method);
		const limiter = isWrite ? makeRateLimit(30, 60_000) : makeRateLimit(120, 60_000);
		limiter(req, res, next);
	});
	app.use("/api/guilds", createGuildRouter(deps));

	if (process.env.NODE_ENV === "production") {
		const distPath = fileURLToPath(new URL("../../../apps/web/dist", import.meta.url));
		app.use(express.static(distPath));
		app.get("/{*path}", (_req, res) => {
			res.sendFile(
				fileURLToPath(new URL("../../../apps/web/dist/index.html", import.meta.url))
			);
		});
	}

	app.listen(Port, () => {
		important.info(`[dashboard] Server running on http://localhost:${Port}`);
	});
}
