import {
	type CustomCritical,
	generateStatsDice,
	replaceFormulaInDice,
} from "@dicelette/core";
import { t } from "@dicelette/localization";
import {
	convertNameToValue,
	getExpression,
	getRoll,
	ResultAsText,
	replaceStatInDice,
	rollCustomCritical,
	type Server,
	skillCustomCritical,
	trimAll,
} from "@dicelette/parse_result";
import type { Translation, UserData } from "@dicelette/types";
import { capitalizeBetweenPunct } from "@dicelette/utils";
import type { EClient } from "client";
import { getRightValue } from "database";
import * as Djs from "discord.js";
import { embedError, reply, sendResult } from "messages";
import { getLangAndConfig } from "utils";

/**
 * create the roll dice, parse interaction etc... When the slash-commands is used for dice
 */
export async function rollWithInteraction(
	interaction: Djs.CommandInteraction,
	dice: string,
	client: EClient,
	critical?: { failure?: number | undefined; success?: number | undefined },
	user?: Djs.User,
	charName?: string,
	infoRoll?: { name: string; standardized: string },
	hideResult?: false | true | null,
	customCritical?: Record<string, CustomCritical> | undefined,
) {
	//exclude announcement channel
	const { langToUse, ul, config } = getLangAndConfig(client, interaction);
	const data: Server = {
		lang: langToUse,
		userId: user?.id ?? interaction.user.id,
		config,
		dice,
	};
	const result = getRoll(dice);
	const defaultMsg = new ResultAsText(
		result,
		data,
		critical,
		charName,
		infoRoll,
		customCritical,
	);
	const output = defaultMsg.defaultMessage();
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
		hideResult,
	);
}

/**
 * Processes a dice roll command based on a user's attack or ability, constructs the appropriate dice formula using user statistics and command options, and sends the roll result to the user.
 *
 * If the specified attack or damage is not found in the user's data, replies with an ephemeral error message.
 *
 * @param {Djs.CommandInteraction} interaction
 * @param {EClient} client
 * @param {UserData} userStatistique
 * @param {Djs.CommandInteractionOptionResolver} options - Command options containing the attack name, expression, and optional comments.
 * @param {Translation} ul
 * @param {string|undefined} charOptions - Optional character name or identifier to select the relevant character data.
 * @param {Djs.User|undefined} user
 * @param {boolean|null|undefined} hideResult - If true, the roll result is hidden from other users.
 */
export async function rollDice(
	interaction: Djs.CommandInteraction,
	client: EClient,
	userStatistique: UserData,
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation,
	charOptions?: string,
	user?: Djs.User,
	hideResult?: boolean | null,
) {
	let atq = options.getString(t("common.name"), true);
	const infoRoll = {
		name: atq,
		standardized: atq.standardize(),
	};
	atq = atq.standardize();
	const expression = options.getString(t("common.expression")) ?? "0";
	const comm = options.getString(t("common.comments"))
		? `# ${options.getString(t("common.comments"))}`
		: undefined;
	const comments = comm ?? "";
	let dice = userStatistique.damage?.[atq];
	// noinspection LoopStatementThatDoesntLoopJS
	while (!dice) {
		const userData = client.settings
			.get(interaction.guild!.id, `user.${user?.id ?? interaction.user.id}`)
			?.find((char) => {
				return char.charName?.subText(charOptions);
			});
		const damageName = userData?.damageName ?? [];
		const findAtqInList = damageName.find((atqName) => atqName.subText(atq));
		if (findAtqInList) {
			atq = findAtqInList;
			dice = userStatistique.damage?.[findAtqInList];
		}
		if (dice) break;
		await reply(interaction, {
			embeds: [
				embedError(
					ul("error.damage.notFound", {
						atq: infoRoll.name.capitalize(),
						charName: charOptions ?? "",
					}),
					ul,
				),
			],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const dollarValue = convertNameToValue(atq, userStatistique.stats);
	const expr = getExpression(
		dice,
		expression,
		userStatistique.stats,
		dollarValue?.total,
	);
	dice = expr.dice;
	const expressionStr = expr.expressionStr;
	dice = generateStatsDice(dice, userStatistique.stats, dollarValue?.total);
	const comparatorMatch = /(?<sign>[><=!]+)(?<comparator>(.+))/.exec(dice);
	let comparator = "";
	if (comparatorMatch) {
		dice = dice.replace(comparatorMatch[0], "");
		comparator = comparatorMatch[0];
	}

	if (dollarValue && comparator.length > 0) {
		const originalName = infoRoll.name;
		if (dollarValue.diceResult)
			infoRoll.name = replaceStatInDice(
				infoRoll.name,
				userStatistique.stats,
				dollarValue.diceResult,
			).trimEnd();
		else
			infoRoll.name = replaceStatInDice(
				infoRoll.name,
				userStatistique.stats,
				"",
			);
		if (infoRoll.name.length === 0)
			infoRoll.name = capitalizeBetweenPunct(originalName);
	}

	comparator = generateStatsDice(
		comparator,
		userStatistique.stats,
		dollarValue?.total,
	);

	const roll = `${trimAll(dice)}${expressionStr}${comparator} ${comments}`;
	await rollWithInteraction(
		interaction,
		roll,
		client,
		undefined,
		user,
		charOptions,
		infoRoll,
		hideResult,
		skillCustomCritical(
			userStatistique.template.customCritical,
			userStatistique.stats,
			dollarValue?.total,
		),
	);
}

/**
 * Processes a statistic-based dice roll command, applying user stats, overrides, and custom criticals, and sends the result to the user.
 *
 * If the selected statistic is excluded or required information is missing, replies with an ephemeral error message.
 *
 * @param {Djs.CommandInteraction} interaction
 * @param {EClient} client
 * @param {UserData} userStatistique
 * @param {Djs.CommandInteractionOptionResolver} options
 * @param {Translation} ul
 * @param {string|undefined} optionChar - Optional character name to associate with the roll.
 * @param {Djs.User|undefined} user - Optional user to attribute the roll to.
 * @param {boolean|null|undefined} hideResult - If true, hides the roll result from other users.
 */
export async function rollStatistique(
	interaction: Djs.CommandInteraction,
	client: EClient,
	userStatistique: UserData,
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation,
	optionChar?: string,
	user?: Djs.User,
	hideResult?: boolean | null,
) {
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
	const override = options.getString(t("dbRoll.options.override.name"));
	let userStat: undefined | number;
	const expression = options.getString(t("common.expression")) ?? "0";
	if (statistic && standardizedStatistic && dice?.includes("$")) {
		const res = getRightValue(
			userStatistique,
			standardizedStatistic,
			ul,
			client,
			interaction,
			optionChar,
			statistic,
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
	if (override) {
		const signRegex = /(?<sign>[><=!]+)(?<comparator>(.+))/;
		const diceMatch = signRegex.exec(dice);
		const overrideMatch = signRegex.exec(override);
		if (diceMatch?.groups && overrideMatch?.groups) {
			dice = dice.replace(diceMatch[0], overrideMatch[0]);
		} else if (!diceMatch && overrideMatch) {
			dice += overrideMatch[0];
		} else if (diceMatch?.groups && !overrideMatch) {
			//search if they are a simple number and not a sign;
			const simpleNumberMatch = /(?<comparator>(.+))/.exec(override);
			const diceComparator = diceMatch.groups.comparator;
			if (simpleNumberMatch && simpleNumberMatch.groups) {
				//if the override is a simple number, we replace the comparator with it
				dice = dice.replace(
					diceComparator,
					simpleNumberMatch.groups.comparator,
				);
			}
		}
	}

	const userStatStr = userStat?.toString();
	const expr = getExpression(
		dice,
		expression,
		userStatistique.stats,
		userStatStr,
	);
	dice = expr.dice;
	const expressionStr = expr.expressionStr;
	const comparatorMatch = /(?<sign>[><=!]+)(?<comparator>(.+))/.exec(dice);
	let comparator = "";
	if (comparatorMatch) {
		//remove from dice
		dice = dice.replace(comparatorMatch[0], "").trim();
		comparator = comparatorMatch[0];
	}
	const roll = `${trimAll(replaceFormulaInDice(dice))}${expressionStr}${generateStatsDice(comparator, userStatistique.stats, userStatStr)} ${comments}`;
	const customCritical = template.customCritical
		? rollCustomCritical(
				template.customCritical,
				userStat,
				userStatistique.stats,
			)
		: undefined;
	const infoRoll =
		statistic && standardizedStatistic
			? { name: statistic, standardized: standardizedStatistic }
			: undefined;
	await rollWithInteraction(
		interaction,
		roll,
		client,
		template.critical,
		user,
		optionChar,
		infoRoll,
		hideResult,
		customCritical,
	);
}
