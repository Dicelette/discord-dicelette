import type { StatisticalTemplate } from "@dicelette/core";
import type { PersonnageIds, Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import { updateMemory } from "database";
import * as Djs from "discord.js";
import {
	createCustomCritical,
	createTemplateEmbed,
	getEmbeds,
	getEmbedsList,
} from "messages";
import { searchUserChannel } from "utils";

/**
 * Updates all user character template messages in a guild to reflect changes made to the template by moderation.
 *
 * For each character belonging to users in the guild, fetches the corresponding message and replaces its template embed with one reflecting the updated template fields. Also updates the in-memory character data to match the new embed.
 *
 * @param {EClient} client
 * @param {Djs.CommandInteraction} interaction
 * @param {Translation} ul
 * @param {StatisticalTemplate} template - The updated statistical template to apply to all user character messages.
 */
export async function bulkEditTemplateUser(
	client: EClient,
	interaction: Djs.CommandInteraction,
	ul: Translation,
	template: StatisticalTemplate
) {
	const guildData = client.settings;
	const users = guildData.get(interaction.guild!.id, "user");

	for (const userID in users) {
		for (const char of users[userID]) {
			const sheetLocation: PersonnageIds = {
				channelId: char.messageId[1],
				messageId: char.messageId[0],
			};
			const thread = await searchUserChannel(
				guildData,
				interaction,
				ul,
				sheetLocation.channelId
			);
			if (!thread) continue;
			try {
				const userMessages = await thread.messages.fetch(sheetLocation.messageId);
				const templateEmbed = getEmbeds(userMessages, "template");
				if (!templateEmbed) continue;
				let newEmbed = createTemplateEmbed(ul);
				if (template.diceType)
					newEmbed.addFields({
						name: ul("common.dice"),
						value: `\`${template.diceType}\``,
						inline: true,
					});
				if (template.critical?.success)
					newEmbed.addFields({
						name: ul("roll.critical.success"),
						value: `\`${template.critical.success}\``,
						inline: true,
					});
				if (template.critical?.failure)
					newEmbed.addFields({
						name: ul("roll.critical.failure"),
						value: `\`${template.critical.failure}\``,
						inline: true,
					});
				if (template.customCritical) {
					newEmbed = createCustomCritical(newEmbed, template.customCritical);
				}
				const listEmbed = getEmbedsList(
					{ which: "template", embed: newEmbed },
					userMessages
				);
				await userMessages.edit({ embeds: listEmbed.list });
				await updateMemory(client.characters, interaction.guild!.id, userID, ul, {
					embeds: listEmbed.list,
				});
			} catch (e) {
				logger.warn(e);
				//pass
			}
		}
	}
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
	const rep = await channel.send({ embeds: [embed], components: [row] });
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
			client.characters.delete(interaction.guild!.id);
			rep.edit({
				components: [],
				content: ul("register.delete.done"),
				embeds: [],
			});
		} else await rep.edit({ components: [] });
	} catch (err) {
		logger.error(err);
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
	for (const [, userData] of Object.entries(users ?? {})) {
		for (const character of userData) {
			const [messageId, channelId] = character.messageId;
			const thread = await searchUserChannel(guildData, interaction, ul, channelId);
			if (!thread) continue;
			try {
				await thread.messages.delete(messageId);
			} catch (err) {
				logger.error(err);
			}
		}
	}
}
