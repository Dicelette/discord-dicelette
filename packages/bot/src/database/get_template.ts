import {
	type StatisticalTemplate,
	templateSchema,
	verifyTemplateValue,
} from "@dicelette/core";
import { ln } from "@dicelette/localization";
import type { Settings } from "@dicelette/types";
import * as Djs from "discord.js";
import type { Message } from "discord.js";

/**
 * Get the statistical Template using the database templateID information
 */
export async function getTemplateWithDB(
	interaction:
		| Djs.ButtonInteraction
		| Djs.ModalSubmitInteraction
		| Djs.CommandInteraction,
	enmap: Settings
) {
	if (!interaction.guild) return;
	const guild = interaction.guild;
	const templateID = enmap.get(interaction.guild.id, "templateID");
	const ul = ln(interaction.locale);
	if (!enmap.has(interaction.guild.id) || !templateID)
		throw new Error(ul("error.noGuildData", { server: interaction.guild.name }));

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
		return getTemplate(message, enmap);
	} catch (error) {
		if ((error as Error).message === "Unknown Message")
			throw new Error(ul("error.noTemplateId", { channelId, messageId }));
		throw new Error(ul("error.noTemplate"));
	}
}

/**
 * Get the guild template when clicking on the "registering user" button or when submitting
 */
export async function getTemplate(
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
