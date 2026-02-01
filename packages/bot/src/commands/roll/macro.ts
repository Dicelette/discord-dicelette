import {
	getInteractionContext as getLangAndConfig,
	macroOptions,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import { logger, sentry } from "@dicelette/utils";
import { getMacro, getStatistics } from "database";
import * as Djs from "discord.js";
import { replyEphemeralError } from "messages";
import { buildDamageAutocompleteChoices, rollMacro } from "utils";

import "discord_ext";

export default {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const choices = await buildDamageAutocompleteChoices(
			interaction,
			client,
			interaction.options.getFocused(true),
			interaction.options as Djs.CommandInteractionOptionResolver
		);
		await interaction.respond(choices);
	},
	data: (macroOptions(new Djs.SlashCommandBuilder()) as Djs.SlashCommandBuilder)
		.setNames("common.macro")
		.setContexts(Djs.InteractionContextType.Guild)
		.setIntegrationTypes(Djs.ApplicationIntegrationType.GuildInstall)
		.setDescriptions("rAtq.description")
		.setDefaultMemberPermissions(0),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const db = client.settings.get(interaction.guild!.id);
		if (!db || !interaction.guild || !interaction.channel) return;
		const user = client.settings.get(interaction.guild.id, `user.${interaction.user.id}`);
		const { ul } = getLangAndConfig(client, interaction);
		if (!user && !db.templateID?.damageName?.length) {
			await replyEphemeralError(interaction, ul("error.user.data"), ul);
			return;
		}

		try {
			// Use centralized helper to fetch user statistics and related context
			const stats = await getMacro(client, ul, interaction, true);
			if (!stats) return;
			const { optionChar, userStatistique } = stats;
			// Note: getStatistics already merged any user settings expansions into userStatistique.stats
			return await rollMacro(
				interaction,
				client,
				userStatistique,
				interaction.options as Djs.CommandInteractionOptionResolver,
				ul,
				optionChar
			);
		} catch (e) {
			logger.fatal(e);
			const errorMessage = e instanceof Error ? e.message : String(e);
			await replyEphemeralError(
				interaction,
				ul("error.generic.e", { e: errorMessage }),
				ul
			);
			sentry.fatal(e, {
				interaction: {
					guildId: interaction.guild?.id,
					id: interaction.id,
					options: interaction.options.data,
					userId: interaction.user.id,
				},
			});
			return;
		}
	},
};
