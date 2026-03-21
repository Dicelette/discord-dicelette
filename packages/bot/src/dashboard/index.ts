import type { Settings, UserSettings } from "@dicelette/types";
import { important } from "@dicelette/utils";
import cors from "cors";
import type Enmap from "enmap";
import express from "express";
import session from "express-session";
import authRoutes from "./routes/auth.js";
import { createGuildRouter } from "./routes/guilds.js";

export interface DashboardDeps {
	settings: Settings;
	userSettings: Enmap<UserSettings>;
}

export function startDashboardServer(deps: DashboardDeps): void {
	const Port = process.env.DASHBOARD_PORT ?? 3001;
	const FrontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

	const app = express();

	app.use(express.json());
	app.use(cors({ origin: FrontendUrl, credentials: true }));
	app.use(
		session({
			secret: process.env.SESSION_SECRET ?? "dicelette-dev-secret-change-in-prod",
			resave: false,
			saveUninitialized: false,
			cookie: {
				secure: process.env.NODE_ENV === "production",
				httpOnly: true,
				maxAge: 7 * 24 * 60 * 60 * 1000,
			},
		})
	);

	app.use("/api/auth", authRoutes);
	app.use("/api/guilds", createGuildRouter(deps));

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
