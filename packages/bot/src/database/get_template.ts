import {
	type StatisticalTemplate,
	templateSchema,
	verifyTemplateValue,
} from "@dicelette/core";
import { ln } from "@dicelette/localization";
import type { Settings, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import type { Message } from "discord.js";
import type { EClient } from "client";

/**
 * Get the statistical Template using the database templateID information
 */
export async function getTemplateWithInteraction(
	interaction:
		| Djs.ButtonInteraction
		| Djs.ModalSubmitInteraction
		| Djs.CommandInteraction,
	client: EClient
) {
	if (!interaction.guild) return;
	const guild = interaction.guild;
	const ul = ln(interaction.locale);
	const hasCache = client.template.get(guild.id);
	if (!hasCache) return await getTemplate(guild, client.settings, ul);
	return hasCache;
}

export async function getTemplate(guild: Djs.Guild, enmap: Settings, ul: Translation) {
	const templateID = enmap.get(guild.id, "templateID");
	if (!enmap.has(guild.id) || !templateID)
		throw new Error(ul("error.guild.data", { server: guild.name }));

	const { channelId, messageId } = templateID;
	const channel = await guild.channels.fetch(channelId);
	if (
		!channel ||
		channel instanceof Djs.CategoryChannel ||
		channel instanceof Djs.ForumChannel ||
		channel instanceof Djs.MediaChannel
	)
		return;
	try {
		const message = await channel.messages.fetch(messageId);
		return fetchTemplate(message, enmap);
	} catch (error) {
		if ((error as Error).message === "Unknown Message")
			throw new Error(ul("error.template.id", { channelId, messageId }));
		throw new Error(ul("error.template.notFound"));
	}
}

/**
 * Get the guild template when clicking on the "registering user" button or when submitting
 */
export async function fetchTemplate(
	message: Message,
	enmap: Settings
): Promise<StatisticalTemplate | undefined> {
	const template = message?.attachments.first();
	if (!template) return;
	const res = await fetch(template.url).then((res) => res.json());
	if (!enmap.get(message.guild!.id, "templateID.valid")) {
		enmap.set(message.guild!.id, true, "templateID.valid");
		return verifyTemplateValue(res);
	}
	const parsedTemplate = templateSchema.parse(res);
	return parsedTemplate as StatisticalTemplate;
}
