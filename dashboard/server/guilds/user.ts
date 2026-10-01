import { validateAttributeEntry, validateSnippetEntry } from "@dicelette/helpers";
import { parseUserOption, USER_OPTION_KEYS } from "@dicelette/types";
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
		const userId = req.auth!.userId;
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
				? (name: string, value: unknown) =>
						validateAttributeEntry(
							name,
							value,
							userAttrs as Record<string, number | string>
						)
				: (_name: string, value: unknown) =>
						validateSnippetEntry(value, userAttrs, replaceUnknown);

		const { valid, errors } = validateEntries(entries, validateFn);
		res.json({ valid, errors });
	});

	// GET /:guildId/user-config — user's personal settings (without admin rights)
	router.get("/user-config", requireAuth, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const userId = req.auth!.userId;

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
		const userId = req.auth!.userId;

		const body = req.body as {
			snippets?: Record<string, unknown>;
			attributes?: Record<string, unknown>;
			createLinkTemplate?: unknown;
		} & Record<string, unknown>;
		const { snippets, attributes, createLinkTemplate } = body;

		const options = new Map<string, string | boolean | undefined>();
		for (const key of USER_OPTION_KEYS) {
			if (body[key] === undefined) continue;
			const parsed = parseUserOption(key, body[key]);
			if (!parsed.ok) {
				res.status(400).json({ error: parsed.error });
				return;
			}
			options.set(key, parsed.value);
		}

		const currentUserSettings = userSettings.get(guildId, userId);

		let validAttributes: Record<string, number | string> | undefined;
		if (attributes !== undefined) {
			if (typeof attributes !== "object" || Array.isArray(attributes)) {
				res.status(400).json({ error: "Invalid attributes format" });
				return;
			}
			const currentAttrs = currentUserSettings?.attributes ?? {};
			const { valid, errors } = validateEntries(attributes, (name, value) =>
				validateAttributeEntry(name, value, currentAttrs)
			);
			if (Object.keys(errors).length > 0) {
				res.status(400).json({ errors });
				return;
			}
			validAttributes = valid as Record<string, number | string>;
		}

		const currentAttrs = currentUserSettings?.attributes;
		const effectiveAttributes = validAttributes ?? currentAttrs;
		const effectiveReplaceUnknown = options.has("ignoreNotfound")
			? (options.get("ignoreNotfound") as string | undefined)
			: currentUserSettings?.ignoreNotfound;

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

		for (const [key, value] of options) {
			if (value === undefined) userSettings.delete(guildId, `${userId}.${key}`);
			else userSettings.set(guildId, value, `${userId}.${key}`);
		}

		if (createLinkTemplate !== undefined)
			userSettings.set(guildId, createLinkTemplate, `${userId}.createLinkTemplate`);

		res.json({ ok: true });
	});

	return router;
}
