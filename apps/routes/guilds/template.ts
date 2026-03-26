import { type StatisticalTemplate, verifyTemplateValue } from "@dicelette/core";
import type { GuildData } from "@dicelette/types";
import { Locale } from "discord-api-types/v6";
import type { Request, Response } from "express";
import { Router } from "express";
import type { DashboardDeps } from "..";
import { makeRequireAdmin, requireAuth } from "./utils";

export function createTemplateRouter(deps: DashboardDeps) {
	const { settings, template, botChannels, botGuilds } = deps;
	const router = Router({ mergeParams: true });
	const requireAdmin = makeRequireAdmin(botGuilds);

	// GET /guildId/template — récupère le template statistique du serveur (admin uniquement)
	router.get("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;

		// Priorité : cache mémoire
		const cached = template.get(guildId);
		if (cached) {
			res.json(cached);
			return;
		}

		// Fallback : récupération de la pièce jointe depuis Discord
		const config = settings.get(guildId);
		if (!config?.templateID?.channelId || !config.templateID.messageId) {
			res.status(404).json({ error: "No template registered" });
			return;
		}

		try {
			const msg = await botChannels.fetchMessage(
				config.templateID.channelId,
				config.templateID.messageId
			);
			if (!msg) {
				res.status(404).json({ error: "Template message not found" });
				return;
			}
			const attachment = msg.attachments.find((a) => a.filename === "template.json");
			if (!attachment) {
				res.status(404).json({ error: "Template attachment not found" });
				return;
			}
			const templateData = await fetch(attachment.url).then((r) => r.json());
			res.json(templateData);
		} catch {
			res.status(500).json({ error: "Failed to fetch template" });
		}
	});

	// POST /:guildId/template — importe ou met à jour le template statistique (admin uniquement)
	router.post("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;
		const body = req.body as Record<string, unknown>;
		const hasPublicChannelId = Object.hasOwn(body, "publicChannelId");
		const hasPrivateChannelId = Object.hasOwn(body, "privateChannelId");

		const {
			template: templateBody,
			channelId,
			publicChannelId,
			privateChannelId,
		} = req.body as {
			template: unknown;
			channelId?: string;
			publicChannelId?: string;
			privateChannelId?: string;
		};

		if (!templateBody || typeof templateBody !== "object") {
			res.status(400).json({ error: "Invalid template" });
			return;
		}

		let validated: StatisticalTemplate;
		try {
			validated = verifyTemplateValue(templateBody);
		} catch {
			res.status(400).json({ error: "Invalid template format" });
			return;
		}

		const statsName = validated.statistics ? Object.keys(validated.statistics) : [];
		const excludedStats = validated.statistics
			? Object.keys(
					Object.fromEntries(
						Object.entries(validated.statistics).filter(([, v]) => v.exclude)
					)
				)
			: [];
		const damageName = validated.damage ? Object.keys(validated.damage) : [];

		const current = settings.get(guildId);
		const effectiveChannelId = channelId ?? current?.templateID?.channelId;
		const effectivePublicChannelId = hasPublicChannelId
			? publicChannelId || undefined
			: current?.managerId;
		const effectivePrivateChannelId = hasPrivateChannelId
			? privateChannelId || undefined
			: current?.privateChannel;

		// Poste (ou reposte) le message template sur Discord
		let newMessageId: string | undefined;
		if (effectiveChannelId) {
			const oldMessageId = current?.templateID?.messageId;
			if (oldMessageId && current?.templateID?.channelId) {
				await botChannels.deleteMessage(current.templateID.channelId, oldMessageId);
			}
			const sent = await botChannels.sendTemplate(
				effectiveChannelId,
				validated,
				guildId,
				effectivePublicChannelId,
				effectivePrivateChannelId
			);
			if (!sent) {
				res
					.status(500)
					.json({ error: "Failed to send template message to Discord channel" });
				return;
			}
			newMessageId = sent.messageId;
		}

		template.set(guildId, validated);

		const templateID = {
			channelId: effectiveChannelId ?? "",
			messageId: newMessageId ?? current?.templateID?.messageId ?? "",
			statsName,
			excludedStats,
			damageName,
			valid: true,
		};

		if (current) {
			current.templateID = templateID;
			if (hasPublicChannelId) current.managerId = publicChannelId || undefined;
			if (hasPrivateChannelId) current.privateChannel = privateChannelId || undefined;
			settings.set(guildId, current);
		} else {
			// Première importation — création des settings
			const newData: GuildData = {
				lang: settings.get(guildId, "lang") ?? Locale.EnglishUS,
				managerId: publicChannelId || undefined,
				templateID,
				user: {},
			};
			if (privateChannelId) newData.privateChannel = privateChannelId;
			settings.set(guildId, newData);
		}

		res.json({ ok: true });
	});

	// DELETE /:guildId/template — supprime le template statistique (admin uniquement)
	router.delete("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
		const guildId = req.params.guildId as string;

		template.delete(guildId);

		const current = settings.get(guildId);
		if (current) {
			current.templateID = undefined as unknown as GuildData["templateID"];
			settings.set(guildId, current);
		}

		res.json({ ok: true });
	});

	return router;
}
