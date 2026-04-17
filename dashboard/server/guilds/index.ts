import { Router } from "express";
import type { DashboardDeps } from "../types";
import { isValidSnowflake } from "../utils";
import { createChannelsRouter } from "./channels";
import { createCharactersRouter } from "./characters";
import { createConfigRouter } from "./config";
import { createLogsRouter } from "./logs";
import { createTemplateRouter } from "./template";
import { createUserRouter } from "./user";

export function createGuildRouter(deps: DashboardDeps) {
	const router = Router();

	// Valide le format du guildId pour toutes les routes /:guildId
	router.param("guildId", (_req, res, next, guildId) => {
		if (!isValidSnowflake(guildId)) {
			res.status(400).json({ error: "Invalid guild ID" });
			return;
		}
		next();
	});

	router.use("/:guildId/config", createConfigRouter(deps));
	router.use("/:guildId", createChannelsRouter(deps));
	router.use("/:guildId", createUserRouter(deps));
	router.use("/:guildId/characters", createCharactersRouter(deps));
	router.use("/:guildId/logs", createLogsRouter(deps));
	router.use("/:guildId/template", createTemplateRouter(deps));

	return router;
}
