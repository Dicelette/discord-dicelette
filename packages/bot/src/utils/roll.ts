import {
	type CustomCritical,
	DETECT_CRITICAL,
	DiceTypeError,
	generateStatsDice,
	replaceFormulaInDice,
	type StatisticalTemplate,
} from "@dicelette/core";
import { t } from "@dicelette/localization";
import {
	convertNameToValue,
	getCriticalFromDice,
	getExpression,
	getRoll,
	includeDiceType,
	parseOpposition,
	ResultAsText,
	replaceStatInDiceName,
	rollCustomCritical,
	rollCustomCriticalsFromDice,
	type Server,
	skillCustomCritical,
	trimAll,
} from "@dicelette/parse_result";
import type { RollOptions, Translation, UserData } from "@dicelette/types";
import { COMPILED_PATTERNS, capitalizeBetweenPunct } from "@dicelette/utils";
import type { EClient } from "client";
import { getRightValue, getTemplate } from "database";
import * as Djs from "discord.js";
import { embedError, reply, sendResult } from "messages";
import { getLangAndConfig } from "utils";
import { findBestMatchingDice } from "./find_macro";

/**
 * Compose the final roll string by applying critical removal, threshold substitution,
 * comparator extraction and evaluation in a single pass. This centralizes duplicated
 * logic previously present in both `rollMacro` and `rollStatistique`.
 */
function composeRollBase(
	dice: string,
	threshold: string | undefined,
	comparatorPattern: RegExp,
	stats: Record<string, number>,
	statTotal: string | number | undefined,
	expressionStr: string,
	comments: string
): {
	diceWithoutComparator: string;
	rawComparator: string;
	comparatorEvaluated: string;
	roll: string;
} {
	// Remove critical detection markers (already parsed elsewhere) and normalize whitespace
	let working = dice.replace(DETECT_CRITICAL, "").trim();
	// Apply threshold logic only once
	working = getThreshold(working, threshold);
	// Extract comparator using reusable helper
	const { dice: noComparator, comparator: rawComparator } = extractComparator(
		working,
		comparatorPattern
	);
	const comparatorEvaluated = generateStatsDice(
		rawComparator,
		stats,
		statTotal?.toString()
	);
	const roll = `${trimAll(noComparator)}${expressionStr}${comparatorEvaluated} ${comments}`;
	return {
		diceWithoutComparator: noComparator,
		rawComparator,
		comparatorEvaluated,
		roll,
	};
}

/**
 * create the roll dice, parse interaction etc... When the slash-commands is used for dice
 */
export async function rollWithInteraction(
	interaction: Djs.CommandInteraction,
	dice: string,
	client: EClient,
	opts: RollOptions
) {
	const {
		critical,
		user,
		charName,
		infoRoll,
		hideResult,
		customCritical,
		opposition,
		silent,
	} = opts;
	const { langToUse, ul, config } = getLangAndConfig(client, interaction);
	const data: Server = {
		config,
		dice,
		lang: langToUse,
		userId: user?.id ?? interaction.user.id,
	};
	const result = getRoll(dice);

	const defaultMsg = new ResultAsText(
		result,
		data,
		critical,
		charName,
		infoRoll,
		customCritical,
		opposition
	);
	const output = defaultMsg.defaultMessage();
	if (!silent) {
		if (defaultMsg.error) {
			await reply(interaction, {
				embeds: [embedError(output, ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}

		return await sendResult(
			interaction,
			{ roll: defaultMsg },
			client.settings,
			ul,
			user,
			hideResult
		);
	}
	if (defaultMsg.error) throw new DiceTypeError(dice, output);
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
	let atq = options.getString(t("common.name"), true);
	const infoRoll = {
		name: atq,
		standardized: atq.standardize(),
	};
	atq = atq.standardize();
	const expression = options.getString(t("common.expression")) ?? "0";
	const oppositionVal = options.getString(t("dbRoll.options.opposition.name"));
	const comm = options.getString(t("common.comments"))
		? `# ${options.getString(t("common.comments"))}`
		: undefined;
	const comments = comm ?? "";
	let dice = userStatistique.damage?.[atq];
	let threshold = options.getString(t("dbRoll.options.override.name"))?.trimAll();

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
	dice = generateStatsDice(dice, userStatistique.stats, dollarValue?.total);
	if (threshold)
		threshold = generateStatsDice(threshold, userStatistique.stats, dollarValue?.total);
	const rCC = getCriticalFromDice(dice, ul);
	// Unified dice composition (critical removal, threshold application, comparator extraction)
	const composed = composeRollBase(
		dice,
		threshold,
		COMPILED_PATTERNS.COMPARATOR,
		userStatistique.stats,
		dollarValue?.total,
		expressionStr,
		comments
	);
	dice = composed.diceWithoutComparator;
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
				dollarValue?.total
			)
		: undefined;
	const roll = composed.roll;
	const opts: RollOptions = {
		charName: charOptions,
		customCritical: skillCustomCritical(
			rCC || userStatistique.template.customCritical,
			userStatistique.stats,
			dollarValue?.total
		),
		hideResult,
		infoRoll,
		opposition,
		user,
	};
	await rollWithInteraction(interaction, roll, client, opts);
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
	console.log(
		"UserStatistique:",
		client.settings.get(interaction.guildId!)?.templateID.statsName
	);
	let statistic = options.getString(t("common.statistic"), false);
	const template = userStatistique.template;
	let dice = template.diceType;
	let standardizedStatistic = statistic?.standardize(true);
	//return if the standardizedStatistic is excluded from the list
	const excludedStats = client.settings
		.get(interaction.guild!.id, "templateID.excludedStats")
		?.map((stat) => stat.standardize());
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
	const comm = options.getString(t("common.comments"))
		? `# ${options.getString(t("common.comments"))}`
		: undefined;
	const comments = comm ?? "";
	let threshold = options.getString(t("dbRoll.options.override.name"))?.trimAll();
	const oppositionVal = options.getString(t("dbRoll.options.opposition.name"));
	let userStat: undefined | number;
	const expression = options.getString(t("common.expression")) ?? "0";
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
	if (threshold)
		threshold = generateStatsDice(threshold, userStatistique.stats, userStat?.toString());
	const userStatStr = userStat?.toString();
	const expr = getExpression(
		dice,
		expression,
		userStatistique.stats,
		userStatStr,
		client.settings.get(interaction.guildId!)?.templateID.statsName
	);
	dice = expr.dice;
	const expressionStr = expr.expressionStr;
	const findStatsExpr = expr.statsFound;
	const rCc = rollCustomCriticalsFromDice(dice, ul, userStat, userStatistique.stats);
	// Unified composition for statistique variant
	const composed = composeRollBase(
		dice,
		threshold,
		COMPILED_PATTERNS.COMPARATOR_SIMPLE,
		userStatistique.stats,
		userStatStr,
		expressionStr,
		comments
	);
	dice = composed.diceWithoutComparator;
	const rawComparator = composed.rawComparator;
	const diceEvaluated = replaceFormulaInDice(dice);
	const opposition = oppositionVal
		? parseOpposition(oppositionVal, rawComparator, userStatistique.stats, userStatStr)
		: undefined;
	let infoRoll =
		statistic && standardizedStatistic
			? { name: statistic, standardized: standardizedStatistic }
			: undefined;
	if (!infoRoll && findStatsExpr)
		infoRoll = { name: findStatsExpr.join(" "), standardized: findStatsExpr.join(" ") };

	const roll = composed.roll;
	const customCritical =
		rCc || rollCustomCritical(template.customCritical, userStat, userStatistique.stats);

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
	criticalsFromDice?: Record<string, CustomCritical>
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
		const serverCriticals = rollCustomCritical(serverData.customCritical);
		if (serverCriticals)
			return {
				criticalsFromDice: Object.assign(serverCriticals, criticalsFromDice),
				serverData,
			};
	}
	return { criticalsFromDice, serverData };
}

/**
 * Update the threshold if provided and remove existing comparator from dice.
 */
export function getThreshold(dice: string, threshold?: string) {
	// Optimized threshold application:
	// 1. Execute each regex at most once
	// 2. Replace existing comparator block entirely if threshold provides one
	// 3. If threshold is a plain number and dice already has comparator, swap only numeric part
	if (!threshold) return dice;
	const diceMatch = COMPILED_PATTERNS.COMPARATOR.exec(dice);
	const thresholdMatch = COMPILED_PATTERNS.COMPARATOR.exec(threshold);
	if (thresholdMatch) {
		// Threshold includes a full comparator expression
		if (diceMatch) return dice.replace(diceMatch[0], thresholdMatch[0]);
		return dice + thresholdMatch[0];
	}
	// Threshold does not supply comparator operator, treat as value override
	if (diceMatch?.groups) {
		const value = threshold.trim();
		if (value.length > 0) return dice.replace(diceMatch.groups.comparator, value);
	}
	return dice;
}

/**
 * Extracts a comparator token (e.g. ">=12" or "<=5") from a dice string once.
 * Returns the cleaned dice string and the comparator portion.
 * Using this helper centralizes regex usage and reduces repeated exec calls.
 */
export function extractComparator(
	dice: string,
	pattern: RegExp
): { dice: string; comparator: string } {
	const match = pattern.exec(dice);
	if (!match) return { dice: dice.trim(), comparator: "" };
	return { dice: dice.replace(match[0], "").trim(), comparator: match[0] };
}
