import { cmdLn, t } from "@dicelette/localization";
import { trimAll } from "@dicelette/parse_result";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { rollWithInteraction } from "utils";

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
	async execute(interaction: Djs.CommandInteraction, client: EClient): Promise<void> {
		if (!interaction.guild) return;
		const channel = interaction.channel;
		if (!channel || !channel.isTextBased()) return;
		const option = interaction.options as Djs.CommandInteractionOptionResolver;
		const dice = option.getString(t("roll.option.name"), true);
		const hidden = option.getBoolean(t("dbRoll.options.hidden.name"));
		await rollWithInteraction(
			interaction,
			trimAll(dice),
			client.settings,
			undefined,
			undefined,
			undefined,
			undefined,
			hidden
		);
	},
};
