import { type StatisticalTemplate, verifyTemplateValue } from "@dicelette/core";
import { ln } from "@dicelette/localization";
import type { Settings, Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import type { Message } from "discord.js";
import * as Djs from "discord.js";
import { fetchChannel } from "../utils";

/**
 * Retrieves the statistical template for a guild based on the interaction context.
 *
 * If a cached template exists for the guild, it is returned; otherwise, the template is fetched using the guild's settings and localization.
 *
 * @param {Djs.ButtonInteraction|Djs.ModalSubmitInteraction| Djs.CommandInteraction} interaction - The Discord interaction within a guild context.
 * @param {EClient} client
 * @returns The statistical template for the guild, or undefined if the interaction is not in a guild.
 */
export async function getTemplateByInteraction(
	interaction: Djs.BaseInteraction,
	client: EClient
) {
	if (!interaction.guild) return;
	const guild = interaction.guild;
	const ul = ln(interaction.locale);
	const hasCache = client.template.get(guild.id);
	if (!hasCache) return await getTemplate(guild, client.settings, ul);
	return hasCache;
}

/**
 * Retrieves and validates a statistical template for a guild from stored settings.
 *
 * Attempts to fetch the template message from the configured channel and message ID in the guild's settings. Returns the parsed template if found and valid, or throws a localized error if the template or required data is missing.
 *
 * @param guild - The Discord guild to retrieve the template for.
 * @param enmap - The settings storage containing template configuration.
 * @param ul - Localization function for error messages.
 * @param skipNoFound - Optional flag to skip the error if the template is not found. Only used when the bot initializes.
 * @returns The validated statistical template, or undefined if the channel is not a text channel.
 *
 * @throws {Error} If the guild data or template ID is missing in settings.
 * @throws {Error} If the template message is not found or cannot be retrieved.
 */
export async function getTemplate(
	guild: Djs.Guild,
	enmap: Settings,
	ul: Translation,
	skipNoFound = false
) {
	const templateID = enmap.get(guild.id, "templateID");
	if (!enmap.has(guild.id) || !templateID) {
		if (!skipNoFound) throw new Error(ul("error.guild.data", { server: guild.name }));
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
		return fetchTemplate(message, enmap);
	} catch (error) {
		logger.warn(error);
		if (skipNoFound) return undefined;
		if ((error as Error).message === "Unknown Message")
			throw new Error(ul("error.template.id", { channelId, messageId }));
		throw new Error(ul("error.template.notFound", { guildId: guild.name }));
	}
}

/**
 * Retrieves and validates a statistical template from a message attachment.
 *
 * Downloads the first attachment from the given message, parses its JSON content, and validates it as a statistical template. If the template validity flag is not set in the settings for the guild, the flag is set and the template is verified before returning.
 *
 * @param message - The Discord message containing the template attachment.
 * @param enmap - The settings storage used to track template validity.
 * @returns The parsed and validated statistical template, or undefined if no attachment is found.
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
	return verifyTemplateValue(res, false);
}
