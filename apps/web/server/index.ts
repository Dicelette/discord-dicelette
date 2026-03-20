import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import guildRoutes from "./routes/guilds.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.DASHBOARD_PORT ?? 3001;

app.use(express.json());
app.use(
	cors({
		origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
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
app.use("/api/guilds", guildRoutes);

// In production, serve the built frontend
if (process.env.NODE_ENV === "production") {
	const distPath = path.join(__dirname, "../dist");
	app.use(express.static(distPath));
	app.get("*", (_req, res) => {
		res.sendFile(path.join(distPath, "index.html"));
	});
}

app.listen(PORT, () => {
	console.log(`Dicelette dashboard server running on http://localhost:${PORT}`);
});

export default app;
