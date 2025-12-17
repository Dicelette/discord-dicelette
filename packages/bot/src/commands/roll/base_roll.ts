import {
	getGuildContext,
	getInteractionContext as getLangAndConfig,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import {
	buildInfoRollFromStats,
	parseComparator,
	replaceStatsInDiceFormula,
	rollCustomCriticalsFromDice,
} from "@dicelette/parse_result";
import {
	CHARACTER_DETECTION,
	DICE_COMPILED_PATTERNS,
	profiler,
	REMOVER_PATTERN,
} from "@dicelette/utils";
import * as Djs from "discord.js";

import { getCritical, rollWithInteraction } from "utils";
import "discord_ext";
import type { ComparedValue } from "@dicelette/core";
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
	silent?: boolean,
	user: Djs.User = interaction.user
): Promise<void> {
	profiler.startProfiler();
	const { ul } = getLangAndConfig(client, interaction);
	let firstChara: string | undefined;
	if (dice.match(REMOVER_PATTERN.STAT_MATCHER) && interaction.guild)
		firstChara = await getCharFromText(client, interaction.guild.id, user.id, dice);
	if (firstChara) dice = dice.replace(CHARACTER_DETECTION, "").trim();

	const data = interaction.guild
		? await getUserFromInteraction(client, user.id, interaction, firstChara, {
				skipNotFound: true,
			})
		: undefined;
	const userData = data?.userData;
	let charName = data?.charName ?? firstChara;
	if (!charName && dice.match(CHARACTER_DETECTION)) {
		charName = dice.match(CHARACTER_DETECTION)![1];
		dice = dice.replace(CHARACTER_DETECTION, "").trim();
	}
	const ctx = interaction.guild
		? getGuildContext(client, interaction.guild.id)
		: undefined;

	let opposition: ComparedValue | undefined;
	const evaluated = DICE_COMPILED_PATTERNS.TARGET_VALUE.exec(dice);
	if (!evaluated) {
		// Remove the second comparator for opposition rolls (e.g., 1d20>15>20 becomes 1d20>15)
		const oppositionMatch = DICE_COMPILED_PATTERNS.OPPOSITION.exec(dice);
		opposition = parseComparator(dice, userData?.stats, undefined);
		if (oppositionMatch?.groups?.second)
			dice = dice.replace(oppositionMatch.groups.second, "").trim();
	} else if (evaluated.groups) {
		//also find the comments and preserve them
		//dice is group 1
		//comments can be group 2
		const { dice: value, comments } = evaluated.groups;
		dice = value;
		if (comments) dice = `${dice} ${comments}`;
	}

	const res = replaceStatsInDiceFormula(
		dice,
		userData?.stats,
		true,
		undefined,
		ctx?.templateID?.statsName
	);
	const { criticalsFromDice, serverData } = await getCritical(
		client,
		ul,
		res.formula,
		interaction.guild || undefined,
		userData,
		rollCustomCriticalsFromDice(dice, ul)
	);

	// Build infoRoll using helper to recover original accented name if available
	const infoRoll = buildInfoRollFromStats(
		res.infoRoll ? [res.infoRoll] : undefined,
		ctx?.templateID?.statsName
	);
	const opts: RollOptions = {
		charName,
		critical: serverData?.critical,
		customCritical: criticalsFromDice,
		hideResult: hidden,
		infoRoll,
		opposition,
		silent,
		statsPerSegment: res.statsPerSegment,
		user,
	};
	await rollWithInteraction(interaction, res.formula, client, opts);
	profiler.stopProfiler();
}
