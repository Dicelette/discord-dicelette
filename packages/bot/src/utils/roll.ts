import {
	type CustomCritical,
	generateStatsDice,
	replaceFormulaInDice,
} from "@dicelette/core";
import { t } from "@dicelette/localization";
import {
	ResultAsText,
	type Server,
	convertNameToValue,
	getModif,
	getRoll,
	replaceStatInDice,
	rollCustomCritical,
	skillCustomCritical,
	trimAll,
} from "@dicelette/parse_result";
import type { Settings, Translation, UserData } from "@dicelette/types";
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
	db: Settings,
	critical?: { failure?: number; success?: number },
	user?: Djs.User,
	charName?: string,
	infoRoll?: { name: string; standardized: string },
	hideResult?: boolean | null,
	customCritical?: Record<string, CustomCritical> | undefined
) {
	//exclude announcement channel
	const { langToUser, ul, config } = getLangAndConfig(db, interaction);
	const data: Server = {
		lang: langToUser,
		userId: user?.id ?? interaction.user.id,
		config,
	};
	const result = getRoll(dice);
	const defaultMsg = new ResultAsText(
		result,
		data,
		critical,
		charName,
		infoRoll,
		customCritical
	);
	const output = defaultMsg.defaultMessage();
	if (defaultMsg.error) {
		await reply(interaction, {
			embeds: [embedError(output, ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	return await sendResult(interaction, { roll: defaultMsg }, db, ul, user, hideResult);
}

export async function rollDice(
	interaction: Djs.CommandInteraction,
	client: EClient,
	userStatistique: UserData,
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation,
	charOptions?: string,
	user?: Djs.User,
	hideResult?: boolean | null
) {
	let atq = options.getString(t("rAtq.atq_name.name"), true);
	const infoRoll = {
		name: atq,
		standardized: atq.standardize(),
	};
	atq = atq.standardize();
	const comm = options.getString(t("dbRoll.options.comments.name"))
		? `# ${options.getString(t("dbRoll.options.comments.name"))}`
		: undefined;
	const comments = comm ?? "";
	//search dice

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
					ul("error.noDamage", {
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
	dice = generateStatsDice(dice, userStatistique.stats, dollarValue?.total);
	const modificator = options.getString(t("dbRoll.options.modificator.name")) ?? "0";
	const modificatorString = getModif(modificator, userStatistique.stats);
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
				dollarValue.diceResult
			).trimEnd();
		else infoRoll.name = replaceStatInDice(infoRoll.name, userStatistique.stats, "");
		if (infoRoll.name.length === 0) infoRoll.name = capitalizeBetweenPunct(originalName);
	}
	comparator = generateStatsDice(comparator, userStatistique.stats, dollarValue?.total);
	const roll = `${trimAll(dice)}${modificatorString}${comparator} ${comments}`;
	await rollWithInteraction(
		interaction,
		roll,
		client.settings,
		undefined,
		user,
		charOptions,
		infoRoll,
		hideResult,
		skillCustomCritical(
			userStatistique.template.customCritical,
			userStatistique.stats,
			dollarValue?.total
		)
	);
}

export async function rollStatistique(
	interaction: Djs.CommandInteraction,
	client: EClient,
	userStatistique: UserData,
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation,
	optionChar?: string,
	user?: Djs.User,
	hideResult?: boolean | null
) {
	let statistic = options.getString(t("common.statistic"), true);
	let standardizedStatistic = statistic.standardize(true);
	//return if the standardizedStatistic is excluded from the list
	const excludedStats = client.settings
		.get(interaction.guild!.id, "templateID.excludedStats")
		?.map((stat) => stat.standardize());
	if (excludedStats?.includes(standardizedStatistic)) {
		await reply(interaction, {
			content: ul("error.excludedStat"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	//model : {dice}{stats only if not comparator formula}{bonus/malus}{formula}{override/comparator}{comments}
	const comm = options.getString(t("dbRoll.options.comments.name"))
		? `# ${options.getString(t("dbRoll.options.comments.name"))}`
		: undefined;
	const comments = comm ?? "";
	const override = options.getString(t("dbRoll.options.override.name"));
	const modification = options.getString(t("dbRoll.options.modificator.name")) ?? "0";

	const res = getRightValue(
		userStatistique,
		standardizedStatistic,
		ul,
		client,
		interaction,
		optionChar,
		statistic
	);
	if (!res) return;
	statistic = res.statistic;
	standardizedStatistic = res.standardizedStatistic;
	const userStat = res.userStat;
	const template = userStatistique.template;
	let dice = template.diceType?.replaceAll("$", userStat.toString());
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
		if (diceMatch && overrideMatch && diceMatch.groups && overrideMatch.groups) {
			dice = dice.replace(diceMatch[0], overrideMatch[0]);
		} else if (!diceMatch && overrideMatch) {
			dice += overrideMatch[0];
		}
	}

	const modificationString = getModif(modification, userStatistique.stats, userStat);
	const comparatorMatch = /(?<sign>[><=!]+)(?<comparator>(.+))/.exec(dice);
	let comparator = "";
	if (comparatorMatch) {
		//remove from dice
		dice = dice.replace(comparatorMatch[0], "").trim();
		comparator = comparatorMatch[0];
	}
	const roll = `${trimAll(replaceFormulaInDice(dice))}${modificationString}${generateStatsDice(comparator, userStatistique.stats, userStat.toString())} ${comments}`;
	const customCritical = template.customCritical
		? rollCustomCritical(template.customCritical, userStat, userStatistique.stats)
		: undefined;
	await rollWithInteraction(
		interaction,
		roll,
		client.settings,
		template.critical,
		user,
		optionChar,
		{ name: statistic, standardized: standardizedStatistic },
		hideResult,
		customCritical
	);
}
