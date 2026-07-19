import { fileURLToPath } from "node:url";
import { important, logger } from "@dicelette/utils";
import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE, createAuthRouter } from "./auth";
import type { JwtPayload } from "./express";
import { createGuildRouter } from "./guilds";
import { makeRateLimit } from "./rateLimit";
import type { DashboardDeps } from "./types";

function parseCookie(header: string | undefined, name: string): string | undefined {
	if (!header) return undefined;
	for (const part of header.split(";")) {
		const trimmed = part.trim();
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		if (trimmed.slice(0, eqIdx).trim() === name) return trimmed.slice(eqIdx + 1);
	}
	return undefined;
}

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
	const cookieSecure = isProduction && !isLocalhostFrontend;

	const jwtSecret = process.env.SESSION_SECRET;
	if (!jwtSecret) {
		if (isProduction) {
			throw new Error(
				"[dashboard] SESSION_SECRET environment variable is required in production"
			);
		}
		important.warn(
			"[dashboard] SESSION_SECRET is not set — using insecure default. Set SESSION_SECRET in production!"
		);
	}
	const secret = jwtSecret ?? "dicelette-dev-secret-change-in-prod";

	const app = express();
	app.set("trust proxy", 1);
	// Keep conditional caching opt-in only (sendEtaggedJson), avoid implicit 304 on all GET routes.
	app.set("etag", false);

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
					// Iconify fetches icons from these CDNs at runtime via @iconify/react.
					"connect-src 'self' https://discord.com https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com",
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

	// JWT middleware: verify the auth cookie on every request and populate req.auth
	app.use((req: Request, _res: Response, next: NextFunction) => {
		const token = parseCookie(req.headers.cookie, AUTH_COOKIE);
		if (token) {
			try {
				req.auth = jwt.verify(token, secret) as JwtPayload;
			} catch {
				// Invalid or expired token — treated as unauthenticated
			}
		}
		next();
	});

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
		createAuthRouter(
			deps.botGuilds,
			deps.guildEvents,
			deps.settings,
			deps.userPreferences,
			secret,
			cookieSecure
		)
	);
	// Guild data routes: 120 req/min per user for reads, 30 req/min for writes (POST/PATCH/DELETE).
	// Limiters are built once at startup — building them per-request would create a new bucket Map
	// on every call, losing state and leaking memory.
	const guildReadLimit = makeRateLimit(120, 60_000);
	const guildWriteLimit = makeRateLimit(30, 60_000);
	app.use("/api/guilds", (req: Request, res: Response, next: NextFunction) => {
		const isWrite = ["POST", "PATCH", "DELETE"].includes(req.method);
		(isWrite ? guildWriteLimit : guildReadLimit)(req, res, next);
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

	// Scanners routinely probe for path traversal using malformed/overlong percent-encoding
	//prevent spam in log from these malformed requests
	app.use((err: unknown, _req: Request, res: Response, next: NextFunction): void => {
		if (err instanceof URIError) {
			logger.debug(`[dashboard] Rejected malformed request URI: ${err.message}`);
			res.status(400).end();
			return;
		}
		next(err);
	});

	app.listen(Port, () => {
		important.info(`[dashboard] Server running on http://localhost:${Port}`);
	});
}
