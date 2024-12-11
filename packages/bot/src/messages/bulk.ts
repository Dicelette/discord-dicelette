import type { StatisticalTemplate } from "@dicelette/core";
import type { PersonnageIds } from "@dicelette/types";
import type { Settings, Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import {
	createCustomCritical,
	createTemplateEmbed,
	getEmbeds,
	getEmbedsList,
} from "messages";
import { searchUserChannel } from "utils";

/**
 * Update the template of existing user when the template is edited by moderation
 * @param guildData {GuildData}
 * @param interaction {Djs.CommandInteraction}
 * @param ul {Translation}
 * @param template {StatisticalTemplate}
 */
export async function bulkEditTemplateUser(
	guildData: Settings,
	interaction: Djs.CommandInteraction,
	ul: Translation,
	template: StatisticalTemplate
) {
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
				const templateEmbed = getEmbeds(ul, userMessages, "template");
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
					ul,
					{ which: "template", embed: newEmbed },
					userMessages
				);
				await userMessages.edit({ embeds: listEmbed.list });
			} catch {
				//pass
			}
		}
	}
}

/**
 * Delete all characters from the guild
 * @param guildData {Settings}
 * @param interaction {Djs.CommandInteraction}
 * @param ul {Translation}
 */
export async function bulkDeleteCharacters(
	guildData: Settings,
	interaction: Djs.CommandInteraction,
	ul: Translation
) {
	//first add a warning using buttons
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
			guildData.delete(interaction.guild!.id, "user");
			await rep.edit({
				components: [],
				content: ul("register.delete.done"),
				embeds: [],
			});
		} else {
			await rep.edit({ components: [] });
		}
	} catch (err) {
		logger.error(err);
	}
	return;
}
