/**
 * Same as calc but without statistics
 */

import {
	calcOptions,
	getInteractionContext as getLangAndConfig,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import * as Djs from "discord.js";
import { calculate } from "./calc";
import "discord_ext";
import { t } from "@dicelette/localization";

export const math = {
	data: (calcOptions(new Djs.SlashCommandBuilder(), false) as Djs.SlashCommandBuilder)
		.setNames("math.title")
		.setContexts(Djs.InteractionContextType.Guild)
		.setIntegrationTypes(
			Djs.ApplicationIntegrationType.GuildInstall,
			Djs.ApplicationIntegrationType.UserInstall
		)
		.setDescriptions("math.description"),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const ul = getLangAndConfig(client, interaction).ul;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const optionChar = options.getString(t("common.character"), false) ?? undefined;
		return await calculate(options, ul, interaction, client, undefined, optionChar);
	},
};
