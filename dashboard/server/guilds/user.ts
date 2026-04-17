import { validateAttributeEntry, validateSnippetEntry } from "@dicelette/helpers";
import type { Request, Response } from "express";
import { Router } from "express";
import type { DashboardDeps } from "../types";
import { requireAuth, userCanManageGuild, validateEntries } from "../utils";

export function createUserRouter(deps: DashboardDeps) {
	const { userSettings, botGuilds, settings } = deps;
	const router = Router({ mergeParams: true });

	// POST /:guildId/validate-entries — validate snippets or attributes (without admin rights)
	router.post("/validate-entries", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;
		const { type, entries, attributes, ignoreNotfound } = req.body as {
			type: "snippets" | "attributes";
			entries: Record<string, unknown>;
			attributes?: Record<string, number | string>;
			ignoreNotfound?: unknown;
		};

		if (type !== "snippets" && type !== "attributes") {
			res.status(400).json({ error: "Invalid type: must be 'snippets' or 'attributes'" });
			return;
		}

		if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
			res.status(400).json({ error: "Invalid entries format" });
			return;
		}

		if (ignoreNotfound !== undefined && typeof ignoreNotfound !== "string") {
			res.status(400).json({ error: "Invalid ignoreNotfound format" });
			return;
		}

		const user = userSettings.get(guildId, userId);
		const storedAttrs = user?.attributes;
		const normalizedIgnoreNotfound = ignoreNotfound?.trim();
		const replaceUnknown = normalizedIgnoreNotfound || user?.ignoreNotfound;
		const userAttrs = attributes ?? storedAttrs;
		const validateFn =
			type === "attributes"
				? (name: string, value: unknown) => validateAttributeEntry(name, value)
				: (_name: string, value: unknown) =>
						validateSnippetEntry(value, userAttrs, replaceUnknown);

		const { valid, errors } = validateEntries(entries, validateFn);
		res.json({ valid, errors });
	});

	// GET /:guildId/user-config — user's personal settings (without admin rights)
	router.get("/user-config", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		const isAdmin = await userCanManageGuild(userId, guildId, botGuilds, settings);
		const userConfig = userSettings.get(guildId, userId) ?? null;

		// Check if user has strict Administrator permission (for dashboardAccess editing)
		let isStrictAdmin = false;
		const guild = botGuilds.get(guildId);
		if (guild) {
			try {
				const member = await guild.fetchMember(userId);
				if (member) {
					const Administrator = BigInt(0x8);
					isStrictAdmin = member.hasPermission(Administrator);
				}
			} catch {
				// Fetch failed — keep false
			}
		}

		res.json({ isAdmin, isStrictAdmin, userConfig });
	});

	// PATCH /:guildId/user-config — updates personal settings (without admin rights)
	router.patch("/user-config", requireAuth, (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.session.userId!;

		const { snippets, attributes, createLinkTemplate, ignoreNotfound } = req.body as {
			snippets?: Record<string, unknown>;
			attributes?: Record<string, unknown>;
			createLinkTemplate?: unknown;
			ignoreNotfound?: unknown;
		};

		if (ignoreNotfound !== undefined && typeof ignoreNotfound !== "string") {
			res.status(400).json({ error: "Invalid ignoreNotfound format" });
			return;
		}

		const normalizedIgnoreNotfound = ignoreNotfound?.trim();

		let validAttributes: Record<string, number | string> | undefined;
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
			validAttributes = valid as Record<string, number | string>;
		}

		const currentUserSettings = userSettings.get(guildId, userId);
		const currentAttrs = currentUserSettings?.attributes;
		const effectiveAttributes = validAttributes ?? currentAttrs;
		const effectiveReplaceUnknown =
			ignoreNotfound === undefined
				? currentUserSettings?.ignoreNotfound
				: normalizedIgnoreNotfound || undefined;

		if (snippets !== undefined) {
			if (typeof snippets !== "object" || Array.isArray(snippets)) {
				res.status(400).json({ error: "Invalid snippets format" });
				return;
			}
			const { valid, errors } = validateEntries(snippets, (_name, value) =>
				validateSnippetEntry(value, effectiveAttributes, effectiveReplaceUnknown)
			);
			if (Object.keys(errors).length > 0) {
				res.status(400).json({ errors });
				return;
			}
			userSettings.set(guildId, valid, `${userId}.snippets`);
		}

		if (validAttributes !== undefined)
			userSettings.set(guildId, validAttributes, `${userId}.attributes`);

		if (ignoreNotfound !== undefined) {
			if (normalizedIgnoreNotfound)
				userSettings.set(guildId, normalizedIgnoreNotfound, `${userId}.ignoreNotfound`);
			else userSettings.delete(guildId, `${userId}.ignoreNotfound`);
		}

		if (createLinkTemplate !== undefined)
			userSettings.set(guildId, createLinkTemplate, `${userId}.createLinkTemplate`);

		res.json({ ok: true });
	});

	return router;
}
