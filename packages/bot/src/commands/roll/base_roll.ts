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
import type { RollOptions } from "@dicelette/types";
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
		.setContexts(Djs.InteractionContextType.Guild)
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
		const option = interaction.options as Djs.CommandInteractionOptionResolver;
		const dice = option.getString(t("common.dice"), true);
		const hidden = option.getBoolean(t("dbRoll.options.hidden.name"));
		await baseRoll(dice, interaction, client, hidden ?? undefined);
	},
};

export async function baseRoll(
	dice: string,
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	hidden?: boolean,
	silent?: boolean
): Promise<void> {
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
		? await getUserFromInteraction(client, interaction.user.id, interaction, firstChara, {
				skipNotFound: true,
			})
		: undefined;
	const userData = data?.userData;
	let charName = data?.charName ?? firstChara;
	if (!charName && dice.match(/ @\w+/)) {
		charName = dice.match(/ @(\w+)/)![1];
		dice = dice.replace(/ @\w+/, "").trim();
	}
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
	const opts: RollOptions = {
		critical: serverData?.critical,
		charName,
		hideResult: hidden,
		customCritical: criticalsFromDice,
		opposition,
		silent,
	};
	await rollWithInteraction(interaction, res.formula, client, opts);
}
