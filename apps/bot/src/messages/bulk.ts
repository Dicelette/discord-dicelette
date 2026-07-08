import type { EClient } from "@dicelette/client";
import type { StatisticalTemplate } from "@dicelette/core";
import { fetchChannel } from "@dicelette/helpers";
import type { PersonnageIds, Translation } from "@dicelette/types";
import { logger, mapConcurrent } from "@dicelette/utils";
import { updateMemory } from "database";
import * as Djs from "discord.js";
import {
	createCustomCritical,
	createTemplateEmbed,
	getEmbeds,
	replaceEmbedInList,
} from "messages";
import { searchUserChannel } from "utils";

/**
 * Core logic to update all user character template embeds.
 * No user interaction — silent on errors.
 *
 * @param client - The Discord bot client
 * @param guildId - Guild ID where characters are located
 * @param template - The updated statistical template
 * @param ul - Localization function for building embeds
 */
export async function bulkEditTemplateUser(
	client: EClient,
	guildId: string,
	template: StatisticalTemplate,
	ul: Translation
): Promise<void> {
	const guildData = client.settings;
	const users = guildData.get(guildId, "user");
	if (!users) return;

	const guild = client.guilds.cache.get(guildId);
	if (!guild) {
		logger.warn(`Guild ${guildId} not found for bulk template update`);
		return;
	}

	const jobs = Object.entries(users).flatMap(([userID, userChars]) =>
		userChars.map((char) => ({ char, userID }))
	);
	await mapConcurrent(jobs, 3, async ({ char, userID }) => {
		const sheetLocation: PersonnageIds = {
			channelId: char.messageId[1],
			messageId: char.messageId[0],
		};
		try {
			const channel = await fetchChannel(guild, sheetLocation.channelId);
			if (!channel?.isTextBased()) return;

			const userMessages = await channel.messages.fetch(sheetLocation.messageId);
			const templateEmbed = getEmbeds(userMessages, "template");
			if (!templateEmbed) return;

			let newEmbed = createTemplateEmbed(ul);
			if (template.diceType && template.diceType.length > 0)
				newEmbed.addFields({
					inline: true,
					name: ul("common.dice"),
					value: `\`${template.diceType}\``,
				});
			if (template.critical?.success)
				newEmbed.addFields({
					inline: true,
					name: ul("roll.critical.success"),
					value: `\`${template.critical.success}\``,
				});
			if (template.critical?.failure)
				newEmbed.addFields({
					inline: true,
					name: ul("roll.critical.failure"),
					value: `\`${template.critical.failure}\``,
				});
			if (template.customCritical) {
				newEmbed = createCustomCritical(newEmbed, template.customCritical);
			}
			const listEmbed = await replaceEmbedInList(
				ul,
				{ embed: newEmbed, which: "template" },
				userMessages
			);
			await userMessages.edit({ embeds: listEmbed.list, files: listEmbed.files });
			await updateMemory(
				client.characters,
				guildId,
				userID,
				ul,
				{
					embeds: listEmbed.list,
				},
				client.characterCacheTimestamps
			);
		} catch (e) {
			logger.warn(e);
			//pass
		}
	});
}

/**
 * Prompts for confirmation and deletes all character data and messages in the guild.
 *
 * Displays a confirmation dialog to the user. If confirmed, removes all character messages, clears character data from guild settings and cache, and updates the confirmation message. If canceled or timed out, no characters are deleted.
 */
export async function bulkDeleteCharacters(
	client: EClient,
	interaction: Djs.CommandInteraction,
	ul: Translation
) {
	//first add a warning using buttons
	const guildData = client.settings;
	const msg = ul("register.delete.confirm");
	const embed = new Djs.EmbedBuilder()
		.setTitle(ul("deleteChar.confirm.title"))
		.setDescription(msg)
		.setColor(Djs.Colors.Red);
	const confirm = new Djs.ButtonBuilder()
		.setCustomId("delete_all_confirm")
		.setStyle(Djs.ButtonStyle.Danger)
		.setLabel(ul("common.confirm"));
	const cancel = new Djs.ButtonBuilder()
		.setCustomId("delete_all_cancel")
		.setStyle(Djs.ButtonStyle.Secondary)
		.setLabel(ul("common.cancel"));
	const row = new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(
		confirm,
		cancel
	);
	const channel = interaction.channel as Djs.TextChannel;
	const rep = await channel.send({ components: [row], embeds: [embed] });
	const collectorFilter = (i: { user: { id: string | undefined } }) =>
		i.user.id === interaction.user.id;
	try {
		const confirm = await rep.awaitMessageComponent({
			filter: collectorFilter,
			time: 60_000,
		});
		if (confirm.customId === "delete_all_confirm") {
			await deleteMessageChar(client, interaction, ul);
			guildData.delete(interaction.guild!.id, "user");
			client.deleteCharacter(interaction.guild!.id);
			await rep.edit({
				components: [],
				content: ul("register.delete.done"),
				embeds: [],
			});
		} else await rep.edit({ components: [] });
	} catch (err) {
		logger.warn(err);
	}
	return;
}

async function deleteMessageChar(
	client: EClient,
	interaction: Djs.CommandInteraction,
	ul: Translation
) {
	const guildData = client.settings;
	const users = guildData.get(interaction.guild!.id, "user");
	const jobs = Object.values(users ?? {}).flat();
	await mapConcurrent(jobs, 3, async (character) => {
		const [messageId, channelId] = character.messageId;
		try {
			const thread = await searchUserChannel(guildData, interaction, ul, channelId);
			if (!thread) return;
			await thread.messages.delete(messageId);
		} catch (err) {
			logger.warn(err);
		}
	});
}
