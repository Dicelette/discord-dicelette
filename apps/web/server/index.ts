import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import type { Settings, UserSettings } from "@dicelette/types";
import type Enmap from "enmap";
import authRoutes from "./routes/auth.js";
import { createGuildRouter } from "./routes/guilds.js";

export interface DashboardDeps {
	/** The bot's persistent guild settings — shared in-process */
	settings: Settings;
	/** The bot's persistent user settings — shared in-process */
	userSettings: Enmap<UserSettings>;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Start the Dicelette web dashboard server.
 * Called from the bot's entry point so that the Enmap instances are shared.
 */
export function startDashboardServer(deps: DashboardDeps): void {
	const PORT = process.env.DASHBOARD_PORT ?? 3001;
	const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

	const app = express();

	app.use(express.json());
	app.use(
		cors({
			origin: FRONTEND_URL,
			credentials: true,
		}),
	);

	app.use(
		session({
			secret: process.env.SESSION_SECRET ?? "dicelette-dev-secret-change-in-prod",
			resave: false,
			saveUninitialized: false,
			cookie: {
				secure: process.env.NODE_ENV === "production",
				httpOnly: true,
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			},
		}),
	);

	app.use("/api/auth", authRoutes);
	app.use("/api/guilds", createGuildRouter(deps));

	// In production, serve the built frontend
	if (process.env.NODE_ENV === "production") {
		const distPath = path.join(__dirname, "../dist");
		app.use(express.static(distPath));
		app.get("*", (_req, res) => {
			res.sendFile(path.join(distPath, "index.html"));
		});
	}

	app.listen(PORT, () => {
		console.log(`[dashboard] Server running on http://localhost:${PORT}`);
	});
}
