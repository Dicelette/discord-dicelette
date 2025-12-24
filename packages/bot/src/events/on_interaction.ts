import { getInteractionContext as getLangAndConfig } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { ALL_COMMANDS, AUTOCOMPLETE_COMMANDS, commandMenu, resetButton } from "commands";
import { fetchTemplate, getTemplateByInteraction } from "database";
import type * as Djs from "discord.js";
import { embedError } from "messages";
import {
	handleButtonSubmit,
	handleModalSubmit,
	handleSelectSubmit,
} from "./interactions";
import { interactionError } from "./on_error";
export default (client: EClient): void => {
	client.on("interactionCreate", async (interaction: Djs.BaseInteraction) => {
		const { ul, langToUse } = getLangAndConfig(client, interaction);
		const interactionUser = interaction.user;
		try {
			if (interaction.isMessageContextMenuCommand()) {
				await commandMenu(interaction, client);
			} else if (interaction.isChatInputCommand()) {
				const command = ALL_COMMANDS.find(
					(cmd) => cmd.data.name === interaction.commandName
				);
				if (!command) return;
				await command.execute(interaction, client);
			} else if (interaction.isAutocomplete()) {
				const autocompleteInteraction = interaction as Djs.AutocompleteInteraction;
				const command = AUTOCOMPLETE_COMMANDS.find(
					(cmd) => cmd.data.name === autocompleteInteraction.commandName
				);
				if (!command) return;
				await command.autocomplete(autocompleteInteraction, client);
			} else if (interaction.isButton()) {
				let template = await fetchTemplate(interaction.message, client.settings);
				template = template
					? template
					: await getTemplateByInteraction(interaction, client);
				if (!template) {
					if (!interaction.channel || interaction.channel.isDMBased()) return;
					await (interaction.channel as Djs.TextChannel).send({
						embeds: [
							embedError(
								ul("error.template.notFound", {
									guildId: interaction.guild?.name ?? interaction.guildId,
								}),
								ul
							),
						],
					});
					return;
				}
				await handleButtonSubmit(interaction, ul, interactionUser, template, client);
			} else if (interaction.isModalSubmit()) {
				await handleModalSubmit(interaction, ul, interactionUser, client);
			} else if (interaction.isStringSelectMenu()) {
				await handleSelectSubmit(interaction, ul, interactionUser, client.settings);
				await resetButton(interaction.message, ul);
			}
		} catch (e) {
			await interactionError(client, interaction, e as Error, ul, langToUse);
		}
	});
};
