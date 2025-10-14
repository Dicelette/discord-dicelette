import { t } from "@dicelette/localization";
import {
	parseComparator,
	replaceStatsInDiceFormula,
	rollCustomCriticalsFromDice,
} from "@dicelette/parse_result";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { getCritical, getLangAndConfig, rollWithInteraction } from "utils";
import "discord_ext";
import { getCharFromText, getUserFromInteraction } from "database";

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
		.setContexts(
			Djs.InteractionContextType.Guild,
			Djs.InteractionContextType.BotDM,
			Djs.InteractionContextType.PrivateChannel
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
		console.log("Dice Roll command used");
		const option = interaction.options as Djs.CommandInteractionOptionResolver;
		let dice = option.getString(t("common.dice"), true);
		const hidden = option.getBoolean(t("dbRoll.options.hidden.name"));
		const { ul } = getLangAndConfig(client, interaction);
		let firstChara: string | undefined;
		if (dice.match(/\$([a-zA-Z_][a-zA-Z0-9_]*)/) && interaction.guild)
			firstChara = await getCharFromText(
				client,
				interaction.guild.id,
				interaction.user.id,
				dice
			);
		if (firstChara) dice = dice.replace(/ @\w+/, "").trim();
		const data = interaction.guild
			? await getUserFromInteraction(
					client,
					interaction.user.id,
					interaction,
					firstChara,
					{ skipNotFound: true }
				)
			: undefined;
		const userData = data?.userData;
		const charName = data?.charName ?? firstChara;
		const res = replaceStatsInDiceFormula(dice, userData?.stats, true);
		const opposition = parseComparator(dice, userData?.stats, res.infoRoll);
		const { criticalsFromDice, serverData } = await getCritical(
			client,
			ul,
			res.formula,
			interaction.guild || undefined,
			userData,
			rollCustomCriticalsFromDice(dice, ul)
		);
		await rollWithInteraction(
			interaction,
			res.formula,
			client,
			serverData?.critical,
			undefined,
			charName,
			undefined,
			hidden,
			criticalsFromDice,
			opposition
		);
	},
};
