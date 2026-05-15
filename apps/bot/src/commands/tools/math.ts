/**
 * Same as calc but without statistics
 */

import type { EClient } from "@dicelette/client";
import {
	calcOptions,
	getInteractionContext as getLangAndConfig,
} from "@dicelette/helpers";
import * as Djs from "discord.js";
import { calculate } from "./calc";
import "@dicelette/discord_ext";
import { t } from "@dicelette/localization";
import type { UserData } from "@dicelette/types";
import { getStatistics } from "../../database";

export const math = {
	data: (calcOptions(new Djs.SlashCommandBuilder(), false) as Djs.SlashCommandBuilder)
		.setNames("math.title")
		.setDescriptions("math.description")

		.setContexts(
			Djs.InteractionContextType.BotDM,
			Djs.InteractionContextType.Guild,
			Djs.InteractionContextType.PrivateChannel
		)
		.setIntegrationTypes(
			Djs.ApplicationIntegrationType.GuildInstall,
			Djs.ApplicationIntegrationType.UserInstall
		)
		.addBooleanOption((option) =>
			option.setNames("common.hidden").setDescriptions("luckMeter.ephemeral")
		),

	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const ul = getLangAndConfig(client, interaction).ul;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		let optionChar = options.getString(t("common.character"), false) ?? undefined;
		const hide = options.getBoolean(t("common.hidden"), false) ?? undefined;
		let userStatistics: UserData | undefined;
		if (interaction.guild) {
			const data = await getStatistics(interaction, client, true);
			optionChar = data?.optionChar;
			userStatistics = data?.userStatistique;
		}
		return await calculate(
			options,
			ul,
			interaction,
			client,
			userStatistics,
			optionChar,
			hide
		);
	},
};
