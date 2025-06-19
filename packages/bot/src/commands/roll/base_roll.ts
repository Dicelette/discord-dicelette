import { cmdLn, t } from "@dicelette/localization";
import { rollCustomCriticalsFromDice } from "@dicelette/parse_result";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { getLangAndConfig, rollWithInteraction } from "utils";

export const diceRoll = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("roll.name"))
		.setNameLocalizations(cmdLn("roll.name"))
		.setDescription(t("roll.description"))
		.setDescriptionLocalizations(cmdLn("roll.description"))
		.addStringOption((option) =>
			option
				.setName(t("roll.option.name"))
				.setNameLocalizations(cmdLn("roll.option.name"))
				.setDescription(t("roll.option.description"))
				.setDescriptionLocalizations(cmdLn("roll.option.description"))
				.setRequired(true)
		)
		.addBooleanOption((option) =>
			option
				.setName(t("dbRoll.options.hidden.name"))
				.setNameLocalizations(cmdLn("dbRoll.options.hidden.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.hidden.description"))
				.setDescription(t("dbRoll.options.hidden.description"))
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
		const dice = option.getString(t("roll.option.name"), true);
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
