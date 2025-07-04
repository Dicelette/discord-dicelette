import { t } from "@dicelette/localization";
import { rollCustomCriticalsFromDice } from "@dicelette/parse_result";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { getLangAndConfig, rollWithInteraction } from "utils";
import "discord_ext";

export const diceRoll = {
	data: new Djs.SlashCommandBuilder()
		.setNames("roll.name")
		.setDescriptions("roll.description")
		.addStringOption((option) =>
			option
				.setNames("common.dice")
				.setDescriptions("roll.option.description")
				.setRequired(true)
		)
		.addBooleanOption((option) =>
			option
				.setNames("dbRoll.options.hidden.name")
				.setDescriptions("dbRoll.options.hidden.description")
				.setRequired(false)
		),
	async execute(
		interaction: Djs.ChatInputCommandInteraction,
		client: EClient
	): Promise<void> {
		if (!interaction.guild) return;
		const channel = interaction.channel;
		if (!channel || !channel.isTextBased()) return;
		const option = interaction.options as Djs.CommandInteractionOptionResolver;
		const dice = option.getString(t("common.name"), true);
		const hidden = option.getBoolean(t("dbRoll.options.hidden.name"));
		const { ul } = getLangAndConfig(client, interaction);
		const rCC = rollCustomCriticalsFromDice(dice, ul);
		await rollWithInteraction(
			interaction,
			dice,
			client,
			undefined,
			undefined,
			undefined,
			undefined,
			hidden,
			rCC
		);
	},
};
