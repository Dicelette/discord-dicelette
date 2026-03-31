import { validateAttributeEntry, validateSnippetEntry } from "@dicelette/helpers";
import type { Request, Response } from "express";
import { Router } from "express";
import type { DashboardDeps } from "..";
import { requireAuth, userCanManageGuild, validateEntries } from "../utils";

export function createUserRouter(deps: DashboardDeps) {
	const { userSettings, botGuilds } = deps;
	const router = Router({ mergeParams: true });

	// POST /:guildId/validate-entries — validation snippets ou attributs (sans droits admin)
	router.post("/validate-entries", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		const { type, entries } = req.body as {
			type: "snippets" | "attributes";
			entries: Record<string, unknown>;
		};

		if (type !== "snippets" && type !== "attributes") {
			res.status(400).json({ error: "Invalid type: must be 'snippets' or 'attributes'" });
			return;
		}

		if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
			res.status(400).json({ error: "Invalid entries format" });
			return;
		}

		const userAttrs = userSettings.get(guildId, userId)?.attributes;
		const validateFn =
			type === "attributes"
				? (name: string, value: unknown) => validateAttributeEntry(name, value)
				: (_name: string, value: unknown) => validateSnippetEntry(value, userAttrs);

		const { valid, errors } = validateEntries(entries, validateFn);
		res.json({ valid, errors });
	});

	// GET /:guildId/user-config — paramètres personnels de l'utilisateur (sans droits admin)
	router.get("/user-config", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		const isAdmin = await userCanManageGuild(userId, guildId, botGuilds);
		const userConfig = userSettings.get(guildId, userId) ?? null;

		res.json({ isAdmin, userConfig });
	});

	// PATCH /:guildId/user-config — mise à jour des paramètres personnels (sans droits admin)
	router.patch("/user-config", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		const { snippets, attributes, createLinkTemplate } = req.body as {
			snippets?: Record<string, unknown>;
			attributes?: Record<string, unknown>;
			createLinkTemplate?: unknown;
		};

		if (snippets !== undefined) {
			if (typeof snippets !== "object" || Array.isArray(snippets)) {
				res.status(400).json({ error: "Invalid snippets format" });
				return;
			}
			const currentAttrs = userSettings.get(guildId, userId)?.attributes;
			const { valid, errors } = validateEntries(snippets, (_name, value) =>
				validateSnippetEntry(value, currentAttrs)
			);
			if (Object.keys(errors).length > 0) {
				res.status(400).json({ errors });
				return;
			}
			userSettings.set(guildId, valid, `${userId}.snippets`);
		}

		if (attributes !== undefined) {
			if (typeof attributes !== "object" || Array.isArray(attributes)) {
				res.status(400).json({ error: "Invalid attributes format" });
				return;
			}
			const { valid, errors } = validateEntries(attributes, (name, value) =>
				validateAttributeEntry(name, value)
			);
			if (Object.keys(errors).length > 0) {
				res.status(400).json({ errors });
				return;
			}
			userSettings.set(guildId, valid, `${userId}.attributes`);
		}

		if (createLinkTemplate !== undefined)
			userSettings.set(guildId, createLinkTemplate, `${userId}.createLinkTemplate`);

		res.json({ ok: true });
	});

	return router;
}
