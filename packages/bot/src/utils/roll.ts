import {
	extractRollOptions,
	getGuildContext,
	getInteractionContext as getLangAndConfig,
	getStatisticOption,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import type { CustomCritical, SortOrder, StatisticalTemplate } from "@dicelette/core";
import { t } from "@dicelette/localization";
import {
	buildInfoRollFromStats,
	composeRollBase,
	convertNameToValue,
	getCriticalFromDice,
	getExpression,
	getRoll,
	includeDiceType,
	parseOpposition,
	replaceStatInDiceName,
	rollCustomCritical,
	rollCustomCriticalsFromDice,
	type Server,
	skillCustomCritical,
} from "@dicelette/parse_result";
import type { RollOptions, Translation, UserData } from "@dicelette/types";
import {
	capitalizeBetweenPunct,
	DICE_COMPILED_PATTERNS,
	profiler,
} from "@dicelette/utils";
import { getRightValue, getTemplate } from "database";
import * as Djs from "discord.js";
import { embedError, handleRollResult, reply } from "messages";
import { triggerPity } from "../commands";
import { findBestMatchingDice } from "./find_macro";

/**
 * Create and execute a dice roll from a command interaction and present its result according to provided options.
 *
 * @param interaction - The originating command interaction
 * @param dice - The dice expression or template string to roll
 * @param client - The bot client and services used to resolve templates, settings, and state
 * @param opts - Roll presentation and calculation options (e.g., user, charName, infoRoll, critical, customCritical, opposition, hideResult, silent, statsPerSegment)
 * @returns The value returned by the roll result handler when the roll is presented, `undefined` otherwise
 */
export async function rollWithInteraction(
	interaction: Djs.CommandInteraction,
	dice: string,
	client: EClient,
	opts: RollOptions
) {
	profiler.startProfiler();
	const {
		critical,
		user,
		charName,
		infoRoll,
		hideResult,
		customCritical,
		opposition,
		silent,
		statsPerSegment,
	} = opts;
	const { langToUse, ul, config } = getLangAndConfig(client, interaction);
	const data: Server = {
		config,
		dice,
		lang: langToUse,
		userId: user?.id ?? interaction.user.id,
	};
	let pity = false;
	if (interaction.guild) {
		const pityNb = client.criticalCount.get(interaction.guild.id, data.userId!)
			?.consecutive?.failure;
		const pityThreshold = client.settings.get(interaction.guild.id, "pity");
		pity = triggerPity(pityThreshold, pityNb);
	}
	const sort = client.settings.get(interaction.guildId!, "sortOrder");
	const result = getRoll(dice, pity, sort);
	if (!result) {
		await reply(interaction, {
			embeds: [embedError(ul("error.invalidDice.withDice", { dice }), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	if (!silent) {
		return await handleRollResult({
			charName,
			client,
			criticalsFromDice: customCritical,
			deleteInput: false,
			hideResult: hideResult ?? undefined,
			infoRoll,
			lang: data.lang,
			opposition,
			result: result,
			serverCritical: critical,
			source: interaction,
			statsPerSegment,
			ul,
			user,
		});
	}
	profiler.stopProfiler();
	return;
}

/**
 * Processes a dice roll command based on a user's attack or ability, constructs the appropriate dice formula using user statistics and command options, and sends the roll result to the user.
 *
 * If the specified attack or damage is not found in the user's data, replies with an ephemeral error message.
 */
export async function rollMacro(
	interaction: Djs.CommandInteraction,
	client: EClient,
	userStatistique: UserData,
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation,
	charOptions?: string,
	user?: Djs.User,
	/**
	 * If true, hides the roll result from other users.
	 */
	hideResult?: boolean | null
) {
	profiler.startProfiler();
	const sortOrder = client.settings.get(interaction.guildId!, "sortOrder");
	let atq = options.getString(t("common.name"), true);
	const infoRoll = {
		name: atq,
		standardized: atq.standardize(),
	};
	atq = atq.standardize();
	const rollOpts = extractRollOptions(options);
	const { expression, threshold: thresholdOpt, oppositionVal, comments } = rollOpts;
	let dice = userStatistique.damage?.[atq];
	const threshold = thresholdOpt;

	if (!dice) {
		const bestMatch = await findBestMatchingDice(
			client,
			interaction,
			user?.id ?? interaction.user.id,
			atq,
			charOptions
		);

		if (bestMatch) {
			atq = bestMatch.attackName;
			dice = bestMatch.dice;
			infoRoll.name = atq;
			infoRoll.standardized = atq.standardize();

			if (bestMatch.charName && bestMatch.charName !== charOptions) {
				charOptions = bestMatch.charName;
			}
		}
	}

	if (!dice) {
		await reply(interaction, {
			embeds: [
				embedError(
					ul("error.damage.notFound", {
						atq: infoRoll.name.capitalize(),
						charName: charOptions ?? "",
					}),
					ul
				),
			],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	const dollarValue = convertNameToValue(atq, userStatistique.stats);
	const expr = getExpression(dice, expression, userStatistique.stats, dollarValue?.total);
	dice = expr.dice;
	const expressionStr = expr.expressionStr;
	//dice = generateStatsDice(dice, userStatistique.stats, dollarValue?.total);
	//if (threshold)
	//	threshold = generateStatsDice(threshold, userStatistique.stats, dollarValue?.total);
	const rCC = getCriticalFromDice(dice, ul);
	// Unified dice composition (critical removal, threshold application, comparator extraction)
	const composed = composeRollBase(
		dice,
		threshold,
		DICE_COMPILED_PATTERNS.COMPARATOR,
		userStatistique.stats,
		dollarValue?.total,
		expressionStr,
		comments
	);
	//dice = composed.diceWithoutComparator;
	const comparator = composed.comparatorEvaluated;
	const rawComparator = composed.rawComparator;

	// Adjust infoRoll name with stat substitution if comparator present
	if (dollarValue && rawComparator.length > 0) {
		const originalName = infoRoll.name;
		if (dollarValue.diceResult)
			infoRoll.name = replaceStatInDiceName(
				infoRoll.name,
				userStatistique.stats,
				dollarValue.diceResult
			).trimEnd();
		else infoRoll.name = replaceStatInDiceName(infoRoll.name, userStatistique.stats, "");
		if (infoRoll.name.length === 0) infoRoll.name = capitalizeBetweenPunct(originalName);
	}
	const opposition = oppositionVal
		? parseOpposition(
				oppositionVal,
				comparator,
				userStatistique.stats,
				dollarValue?.total,
				sortOrder
			)
		: undefined;
	const roll = composed.roll;
	const opts: RollOptions = {
		charName: charOptions,
		customCritical: skillCustomCritical(
			rCC || userStatistique.template.customCritical,
			userStatistique.stats,
			dollarValue?.total,
			sortOrder
		),
		hideResult,
		infoRoll,
		opposition,
		user,
	};
	await rollWithInteraction(interaction, roll, client, opts);
	profiler.stopProfiler();
}

/**
 * Processes a statistic-based dice roll command, applying user stats, overrides, and custom criticals, and sends the result to the user.
 *
 * If the selected statistic is excluded or required information is missing, replies with an ephemeral error message.
 */
export async function rollStatistique(
	interaction: Djs.CommandInteraction,
	client: EClient,
	userStatistique: UserData,
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation,
	optionChar?: string,
	user?: Djs.User,
	/**
	 * If true, hides the roll result from other users.
	 */
	hideResult?: boolean | null
) {
	profiler.startProfiler();
	const ctx = getGuildContext(client, interaction.guildId!);
	const sortOrder = client.settings.get(interaction.guildId!, "sortOrder");
	let statistic = getStatisticOption(options, false);
	const template = userStatistique.template;
	let dice = template.diceType;
	let standardizedStatistic = statistic?.standardize(true);
	//return if the standardizedStatistic is excluded from the list
	const excludedStats = ctx?.templateID?.excludedStats?.map((stat) => stat.standardize());
	if (standardizedStatistic && excludedStats?.includes(standardizedStatistic)) {
		await reply(interaction, {
			content: ul("error.stats.excluded"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	if (template.diceType?.includes("$") && !statistic) {
		await reply(interaction, {
			content: ul("error.stats.shouldSelect"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	//model : {dice}{stats only if not comparator formula}{bonus/malus}{formula}{override/comparator}{comments}
	const rollOpts = extractRollOptions(options);
	const { expression, threshold: thresholdOpt, oppositionVal, comments } = rollOpts;
	const threshold = thresholdOpt;
	let userStat: undefined | number;
	if (statistic && standardizedStatistic && dice?.includes("$")) {
		const res = getRightValue(
			userStatistique,
			standardizedStatistic,
			ul,
			client,
			interaction.guild!,
			optionChar,
			statistic
		);
		if (!res) return;
		statistic = res.statistic;
		standardizedStatistic = res.standardizedStatistic;
		userStat = res.userStat;

		dice = dice.replaceAll("$", userStat.toString());
	}
	if (!dice) {
		await reply(interaction, {
			content: ul("error.noDice"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	//if (threshold)
	//	threshold = generateStatsDice(threshold, userStatistique.stats, userStat?.toString());
	const userStatStr = userStat?.toString();
	const expr = getExpression(
		dice,
		expression,
		userStatistique.stats,
		userStatStr,
		ctx?.templateID?.statsName
	);
	dice = expr.dice;
	const expressionStr = expr.expressionStr;
	const findStatsExpr = expr.statsFound;
	const rCc = rollCustomCriticalsFromDice(
		dice,
		ul,
		userStat,
		userStatistique.stats,
		sortOrder
	);
	// Unified composition for statistique variant
	const composed = composeRollBase(
		dice,
		threshold,
		DICE_COMPILED_PATTERNS.COMPARATOR_SIMPLE,
		userStatistique.stats,
		userStatStr,
		expressionStr,
		comments
	);
	//dice = composed.diceWithoutComparator;
	//const rawComparator = composed.rawComparator;
	//const diceEvaluated = replaceFormulaInDice(dice);
	const opposition = oppositionVal
		? parseOpposition(
				oppositionVal,
				composed.comparatorEvaluated,
				userStatistique.stats,
				userStatStr,
				sortOrder
			)
		: undefined;
	let infoRoll =
		statistic && standardizedStatistic
			? buildInfoRollFromStats([standardizedStatistic], ctx?.templateID?.statsName)
			: undefined;
	if (!infoRoll && findStatsExpr)
		infoRoll = buildInfoRollFromStats(findStatsExpr, ctx?.templateID?.statsName);

	const roll = composed.roll;
	const customCritical =
		rCc ||
		rollCustomCritical(
			template.customCritical,
			userStat,
			userStatistique.stats,
			sortOrder
		);

	const opts: RollOptions = {
		charName: optionChar,
		critical: template.critical,
		customCritical,
		hideResult,
		infoRoll,
		opposition,
		user,
	};
	await rollWithInteraction(interaction, roll, client, opts);
	profiler.stopProfiler();
}
/**
 * Gets custom criticals based on the server template and user data.
 */
export async function getCritical(
	client: EClient,
	ul: Translation,
	dice: string,
	guild?: Djs.Guild,
	userData?: UserData,
	criticalsFromDice?: Record<string, CustomCritical>,
	sortOrder?: SortOrder
) {
	let serverData: StatisticalTemplate | undefined;
	if (guild)
		serverData =
			client.template.get(guild.id) ??
			(await getTemplate(guild, client.settings, ul, true));
	if (
		serverData?.customCritical &&
		includeDiceType(dice, serverData.diceType, !!userData?.stats)
	) {
		const serverCriticals = rollCustomCritical(
			serverData.customCritical,
			undefined,
			undefined,
			sortOrder
		);
		if (serverCriticals)
			return {
				criticalsFromDice: Object.assign(serverCriticals, criticalsFromDice),
				serverData,
			};
	}

	// Only apply server criticals (basic success/failure thresholds) if the dice type matches
	// This prevents criticals from being applied to incorrect dice types
	const diceMatches =
		serverData && includeDiceType(dice, serverData.diceType, !!userData?.stats);
	return {
		criticalsFromDice,
		serverData: diceMatches ? serverData : undefined,
	};
}
