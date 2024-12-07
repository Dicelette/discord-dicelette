import type { Settings } from "@dicelette/types";
import type * as Djs from "discord.js";

export async function sendLogs(message: string, guild: Djs.Guild, db: Settings) {
	const guildData = db.get(guild.id);
	if (!guildData?.logs) return;
	const channel = guildData.logs;
	try {
		const channelToSend = (await guild.channels.fetch(channel)) as Djs.TextChannel;
		await channelToSend.send(message);
	} catch (error) {
		return;
	}
}
export async function reply(
	interaction:
		| Djs.CommandInteraction
		| Djs.ModalSubmitInteraction
		| Djs.ButtonInteraction
		| Djs.StringSelectMenuInteraction,
	options: string | Djs.InteractionReplyOptions | Djs.MessagePayload
) {
	return interaction.replied || interaction.deferred
		? await interaction.editReply(options)
		: await interaction.reply(options);
}

/**
 * Deletes a given message after a specified time delay.
 * If the time delay is zero, the function exits immediately.
 * Uses setTimeout to schedule the deletion and handles any errors silently.
 * @param message - An instance of InteractionResponse or Message that needs to be deleted.
 * @param time - A number representing the delay in milliseconds before the message is deleted.
 */
export async function deleteAfter(
	message: Djs.InteractionResponse | Djs.Message,
	time: number
): Promise<void> {
	if (time === 0) return;

	setTimeout(async () => {
		try {
			await message.delete();
		} catch (error) {
			// Can't delete message, probably because the message was already deleted; ignoring the error.
		}
	}, time);
}

export function displayOldAndNewStats(
	oldStats?: Djs.APIEmbedField[],
	newStats?: Djs.APIEmbedField[]
) {
	let stats = "";
	if (oldStats && newStats) {
		for (const field of oldStats) {
			const name = field.name.toLowerCase();
			const newField = newStats.find((f) => f.name.toLowerCase() === name);
			if (!newField) {
				stats += `- ~~${field.name}: ${field.value}~~\n`;
				continue;
			}
			if (field.value === newField.value) continue;
			stats += `- ${field.name}: ${field.value} ⇒ ${newField.value}\n`;
		}
		//verify if there is new stats
		for (const field of newStats) {
			const name = field.name.toLowerCase();
			if (!oldStats.find((f) => f.name.toLowerCase() === name)) {
				stats += `- ${field.name}: 0 ⇒ ${field.value}\n`;
			}
		}
	}
	return stats;
}
