import { findln } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import type { PersonnageIds, UserMessageId } from "@dicelette/types";
import type { DiscordChannel } from "@dicelette/types";
import type { EClient } from "client";
import { rename } from "commands";
import { getUserByEmbed, updateMemory } from "database";
import * as Djs from "discord.js";
import { getEmbeds } from "messages";
import type { TextChannel } from "discord.js";

/**
 * Handles validation and execution of a character rename operation from a Discord modal submission.
 *
 * Retrieves and validates the relevant message, user, and character data, then updates the character's name and database records accordingly.
 *
 * @throws {Error} If the required embed, user ID, user object, or character data cannot be found.
 */
export async function validateRename(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	client: EClient
) {
	if (!interaction.message) return;
	const message = await (interaction.channel as TextChannel).messages.fetch(
		interaction.message.id
	);
	await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
	const newName = interaction.fields.getTextInputValue("newName");
	if (!newName || !interaction.channel) return;
	const embed = getEmbeds(ul, message, "user");
	if (!embed) throw new Error(ul("error.embed.notFound"));
	const userId = embed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	if (!userId) throw new Error(ul("error.user.notFound"));
	const user = interaction.client.users.cache.get(userId);
	if (!user) throw new Error(ul("error.user.notFound"));
	const sheetLocation: PersonnageIds = {
		channelId: interaction.channel.id,
		messageId: message.id,
	};
	const charData = getUserByEmbed({ message: message }, ul);
	if (!charData) throw new Error(ul("error.user.youRegistered"));
	const oldData: {
		charName?: string | null;
		messageId: UserMessageId;
		damageName?: string[];
		isPrivate?: boolean;
	} = {
		charName: charData.userName,
		messageId: [sheetLocation.messageId, sheetLocation.channelId],
		damageName: Object.keys(charData.damage ?? {}),
		isPrivate: charData.private,
	};
	const guildData = client.settings.get(interaction.guildId as string);
	if (!guildData) return;
	//update the characters database
	//remove the old chara
	await updateMemory(client.characters, interaction.guild!.id, userId, ul, {
		userData: charData,
	});
	await rename(
		newName,
		interaction,
		ul,
		user,
		client,
		sheetLocation,
		oldData,
		interaction.channel as DiscordChannel
	);
}
