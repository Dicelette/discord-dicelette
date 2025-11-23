import type { Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { embedError, reply } from "../messages";

/**
 * Reply to an interaction with an error embed in ephemeral mode.
 * Consolidates the common pattern of sending error messages that should only
 * be visible to the user who triggered the interaction.
 *
 * @param interaction - The Discord interaction to reply to
 * @param message - The error message to display
 * @param ul - Translation utility for localization
 *
 * @example
 * await replyEphemeralError(interaction, ul("error.user.notFound"), ul);
 */
export async function replyEphemeralError(
	interaction: Djs.ChatInputCommandInteraction | Djs.CommandInteraction,
	message: string,
	ul: Translation
): Promise<void> {
	await reply(interaction, {
		embeds: [embedError(message, ul)],
		flags: Djs.MessageFlags.Ephemeral,
	});
}

/**
 * Reply to an interaction with a simple text message in ephemeral mode.
 * Useful for success messages or simple notifications.
 *
 * @param interaction - The Discord interaction to reply to
 * @param content - The text content to display
 *
 * @example
 * await replyEphemeral(interaction, "Operation successful!");
 */
export async function replyEphemeral(
	interaction: Djs.ChatInputCommandInteraction | Djs.CommandInteraction,
	content: string
): Promise<void> {
	await reply(interaction, {
		content,
		flags: Djs.MessageFlags.Ephemeral,
	});
}
