import process from "node:process";
import type { EClient } from "@dicelette/client";
import { type StatisticalTemplate, verifyTemplateValue } from "@dicelette/core";
import { fetchChannel } from "@dicelette/helpers";
import { ln } from "@dicelette/localization";
import type { Settings, Translation } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	isValidJSON,
	logger,
} from "@dicelette/utils";
import type { Message } from "discord.js";
import * as Djs from "discord.js";

/** Gets the guild's statistical template (from cache if possible, else guild settings). */
export async function getTemplateByInteraction(
	interaction: Djs.BaseInteraction,
	client: EClient,
	skipNoFound = false
) {
	if (!interaction.guild) return;
	const guild = interaction.guild;
	const ul = ln(interaction.locale);
	const hasCache = client.template.get(guild.id);
	if (!hasCache)
		return await getTemplate(guild, client.settings, ul, client, skipNoFound);
	return hasCache;
}

/** Fetches and validates a guild's statistical template from its configured message; `skipNoFound` suppresses errors (used at bot init). */
export async function getTemplate(
	guild: Djs.Guild,
	enmap: Settings,
	ul: Translation,
	client: EClient,
	skipNoFound = false,
	updateCache = true
) {
	const botErrorOptions: BotErrorOptions = {
		cause: "TEMPLATE",
		level: BotErrorLevel.Warning,
	};
	const templateID = enmap.get(guild.id, "templateID");
	if (!enmap.has(guild.id) || !templateID) {
		if (!skipNoFound)
			throw new BotError(ul("error.guild.data", { server: guild.name }), botErrorOptions);
		return undefined;
	}
	const { channelId, messageId } = templateID;
	const channel = await fetchChannel(guild, channelId);
	if (
		!channel ||
		channel instanceof Djs.CategoryChannel ||
		channel instanceof Djs.ForumChannel ||
		channel instanceof Djs.MediaChannel
	)
		return;
	try {
		if (!channel.messages && skipNoFound) return undefined;
		const message = await channel.messages.fetch(messageId);
		const template = await fetchTemplate(message, enmap);
		if (template && updateCache) {
			client.template.set(guild.id, template);
			return template;
		}
	} catch (error) {
		if (skipNoFound) return undefined;
		logger.warn(error as Error);
		if ((error as Error).message === "Unknown Message")
			throw new BotError(
				ul("error.template.id", { channelId, messageId }),
				botErrorOptions
			);
		throw new BotError(
			ul("error.template.notFound", { guildId: guild.name }),
			botErrorOptions
		);
	}
}

/** Downloads and validates a statistical template from a message's first attachment, flagging validity once resolved. */
export async function fetchTemplate(
	message: Message,
	enmap: Settings
): Promise<StatisticalTemplate | undefined> {
	const template = message?.attachments.first();
	if (!template) return;
	if (process.env.NODE_ENV === "development" && process.env.PROXY_DISCORD_CDN)
		template.url = template.url.replace(
			"https://cdn.discordapp.com",
			process.env.PROXY_DISCORD_CDN
		);
	const res = await fetch(template.url);
	const resContent = await res.text();
	const validJson = isValidJSON(resContent);
	if (!res.ok || res.status !== 200 || !validJson) {
		logger.warn(`Invalid JSON format in template attachment: ${template.url}`);
		return undefined;
	}
	if (!enmap.get(message.guild!.id, "templateID.valid")) {
		enmap.set(message.guild!.id, true, "templateID.valid");
		return verifyTemplateValue(validJson);
	}
	return verifyTemplateValue(validJson, false);
}
