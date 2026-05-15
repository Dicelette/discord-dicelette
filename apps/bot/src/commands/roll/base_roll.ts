import type { EClient } from "@dicelette/client";
import {
	extractRollOptions,
	getGuildContext,
	getInteractionContext as getLangAndConfig,
} from "@dicelette/helpers";
import { t } from "@dicelette/localization";
import {
	parseComparator,
	replaceStatsInDiceFormula,
	rollCustomCriticalsFromDice,
} from "@dicelette/parse_result";
import {
	CHARACTER_DETECTION,
	DICE_COMPILED_PATTERNS,
	logger,
	profiler,
} from "@dicelette/utils";
import * as Djs from "discord.js";

import { getCritical, rollWithInteraction } from "utils";
import "@dicelette/discord_ext";
import {
	type ComparedValue,
	type CustomCritical,
	REMOVER_PATTERN,
} from "@dicelette/core";
import type { RollOptions, Translation } from "@dicelette/types";
import { getCharFromText, getUserFromInteraction, resolveStatsNames } from "database";

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
		.setIntegrationTypes(
			Djs.ApplicationIntegrationType.GuildInstall,
			Djs.ApplicationIntegrationType.UserInstall
		)

		.addStringOption((option) =>
			option
				.setNames("common.comments")
				.setDescriptions("dbRoll.options.comments.description")
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setNames("roll.options.cs.name")
				.setDescriptions("roll.options.cs.description")
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setNames("roll.options.cf.name")
				.setDescriptions("roll.options.cf.description")
				.setRequired(false)
		)
		.addBooleanOption((option) =>
			option
				.setNames("common.hidden")
				.setDescriptions("dbRoll.options.hidden.description")
				.setRequired(false)
		),
	async execute(
		interaction: Djs.ChatInputCommandInteraction,
		client: EClient
	): Promise<void> {
		logger.info(
			`Log: Executing /roll cmds for ${interaction.user.username} in ${interaction.guild?.name} - DM:${interaction.channel?.type === Djs.ChannelType.DM}`
		);
		const { ul } = getLangAndConfig(client, interaction);

		const option = interaction.options as Djs.CommandInteractionOptionResolver;
		const dice = option.getString(t("common.dice"), true);
		const hidden = option.getBoolean(t("common.hidden"));
		const { customCritical } = extractRollOptions(option, ul);
		const overrideComment = option.getString(t("common.comments")) ?? undefined;
		await baseRoll(
			dice,
			interaction,
			client,
			hidden ?? undefined,
			undefined,
			undefined,
			overrideComment,
			customCritical,
			ul
		);
	},
};

export async function baseRoll(
	dice: string,
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	hidden?: boolean,
	silent?: boolean,
	user: Djs.User = interaction.user,
	overrideComment?: string,
	customCriticalFromOptions?: Record<string, CustomCritical>,
	ul?: Translation
): Promise<void> {
	profiler.startProfiler();
	if (!ul) ul = getLangAndConfig(client, interaction).ul;

	let firstChara: string | undefined;
	if (dice.match(REMOVER_PATTERN.STAT_MATCHER) && interaction.guild)
		firstChara = await getCharFromText(client, interaction.guild.id, user.id, dice);
	if (firstChara) dice = dice.replace(CHARACTER_DETECTION, "").trim();

	const data = interaction.guild
		? await getUserFromInteraction(client, user.id, interaction, firstChara, {
				attributes: true,
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
	const disableMatch = ctx?.disableCompare;
	const sortOrder = ctx?.settings.sortOrder;
	if (!evaluated && !disableMatch) {
		// Preclean to ignore {cs|cf:...} blocs before checking for opposition
		const contentForOpposition = dice.replace(REMOVER_PATTERN.CRITICAL_BLOCK, "");
		// Remove the second comparator for opposition rolls (e.g., 1d20>15>20 becomes 1d20>15)
		const oppositionMatch = DICE_COMPILED_PATTERNS.OPPOSITION.exec(contentForOpposition);
		opposition = parseComparator(dice, userData?.stats, undefined, sortOrder);
		logger.trace("Opposition match regex result:", oppositionMatch, opposition);
		if (oppositionMatch?.groups?.second)
			dice = dice.replace(oppositionMatch.groups.second, "").trim();
	} else if (evaluated?.groups) {
		//also find the comments and preserve them
		//dice is group 1
		//comments can be group 2
		const doubleTarget = DICE_COMPILED_PATTERNS.DOUBLE_TARGET.exec(dice);
		logger.trace("Double target", doubleTarget);
		const { dice: value, comments } = evaluated.groups;
		if (doubleTarget?.groups?.dice) dice = value;
		else dice = `{${value}}`;
		if (comments) dice = `${dice} ${comments}`;
	} else if (disableMatch) {
		//find comments first to preserve them
		const allComments = dice.match(DICE_COMPILED_PATTERNS.COMMENTS_REGEX);
		const comments = allComments ? ` ${allComments.join(" ")}` : "";
		dice = dice.replace(DICE_COMPILED_PATTERNS.COMMENTS_REGEX, "").trim();
		dice = `{${dice}}${comments}`;
	}

	logger.trace(`Original dice formula for ${user.tag}: ${dice}`);
	const allStatNames = resolveStatsNames(userData, ctx?.templateID?.statsName);
	const res = replaceStatsInDiceFormula(
		dice,
		userData?.stats,
		true,
		undefined,
		allStatNames,
		ul,
		interaction.guild
			? client.userSettings.get(interaction.guild.id, user.id)?.ignoreNotfound
			: undefined
	);
	const criticalsFromDice = rollCustomCriticalsFromDice(
		dice,
		ul,
		undefined,
		userData?.stats,
		sortOrder
	);
	const { criticalsFromDice: mergedServerCriticals, serverData } = await getCritical(
		client,
		ul,
		res.formula,
		interaction.guild || undefined,
		userData,
		criticalsFromDice,
		sortOrder
	);

	const infoRoll = res.infoRoll
		? { name: res.infoRoll, standardized: res.infoRoll.standardize() }
		: undefined;
	const mergedCustomCritical = customCriticalFromOptions
		? Object.assign({}, mergedServerCriticals ?? {}, customCriticalFromOptions)
		: mergedServerCriticals;
	const opts: RollOptions = {
		charName,
		comment: overrideComment,
		critical: customCriticalFromOptions ? undefined : serverData?.critical,
		customCritical: mergedCustomCritical,
		hideResult: hidden,
		infoRoll,
		opposition,
		silent,
		statsPerSegment: res.statsPerSegment,
		user,
	};
	logger.trace(`Rolling dice for ${user.tag}: ${res.formula}`);
	await rollWithInteraction(interaction, res.formula, client, opts);
	profiler.stopProfiler();
}
