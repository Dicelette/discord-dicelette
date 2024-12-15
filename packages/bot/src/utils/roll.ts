import {
	type CustomCritical,
	generateStatsDice,
	replaceFormulaInDice,
} from "@dicelette/core";
import { ln, t } from "@dicelette/localization";
import {
	ResultAsText,
	type Server,
	convertNameToValue,
	getModif,
	getRoll,
	replaceStatInDice,
	rollCustomCritical,
	skillCustomCritical,
} from "@dicelette/parse_result";
import type { Settings, Translation, UserData } from "@dicelette/types";
import { capitalizeBetweenPunct } from "@dicelette/utils";
import type { EClient } from "client";
import type * as Djs from "discord.js";
import {
	deleteAfter,
	embedError,
	findMessageBefore,
	reply,
	threadToSend,
} from "messages";

/**
 * create the roll dice, parse interaction etc... When the slash-commands is used for dice
 */
export async function rollWithInteraction(
	interaction: Djs.CommandInteraction,
	dice: string,
	channel: Djs.TextBasedChannel,
	db: Settings,
	critical?: { failure?: number; success?: number },
	user?: Djs.User,
	charName?: string,
	infoRoll?: { name: string; standardized: string },
	hideResult?: boolean | null,
	customCritical?: Record<string, CustomCritical> | undefined
) {
	if (!channel || channel.isDMBased() || !channel.isTextBased() || !interaction.guild)
		return;
	const langToUser =
		db.get(interaction.guild.id, "lang") ??
		interaction.guild.preferredLocale ??
		interaction.locale;
	const ul = ln(langToUser);
	const data: Server = {
		lang: langToUser,
		userId: user?.id ?? interaction.user.id,
		config: db.get(interaction.guild.id),
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
			ephemeral: true,
		});
		return;
	}

	const disableThread = db.get(interaction.guild.id, "disableThread");
	let rollChannel = db.get(interaction.guild.id, "rollChannel");
	const hideResultConfig = db.get(interaction.guild.id, "hiddenRoll") as
		| string
		| boolean
		| undefined;
	const hidden = hideResult && hideResultConfig;
	let isHidden: undefined | string = undefined;
	if (hidden) {
		if (typeof hideResultConfig === "string") {
			//send to another channel ;
			rollChannel = hideResultConfig;
			isHidden = hideResultConfig;
		} else if (typeof hideResultConfig === "boolean") {
			await reply(interaction, {
				content: output,
				allowedMentions: { users: [data!.userId as string] },
				ephemeral: true,
			});
			return;
		}
	}
	if (channel.name.startsWith("🎲") || disableThread || rollChannel === channel.id) {
		await reply(interaction, {
			content: output,
			allowedMentions: { users: [data!.userId as string] },
			ephemeral: !!hidden,
		});
		return;
	}

	const thread = await threadToSend(db, channel, ul, isHidden);
	const rolLog = await thread.send("_ _");
	const editMessage = defaultMsg.edit().result;
	await rolLog.edit(editMessage);
	const rollLogEnabled = db.get(interaction.guild.id, "linkToLogs");
	const rolLogUrl = rollLogEnabled ? rolLog.url : undefined;
	const rollTextUrl = defaultMsg.logUrl(rolLogUrl).result;
	const inter = await reply(interaction, {
		content: rollTextUrl,
		allowedMentions: { users: [data!.userId as string] },
		ephemeral: !!hidden,
	});
	const anchor = db.get(interaction.guild.id, "context");
	const dbTime = db.get(interaction.guild.id, "deleteAfter");
	const timer = dbTime ? dbTime : 180000;
	let messageId = undefined;
	if (anchor) {
		messageId = inter.id;
		if (timer && timer > 0) {
			const messageBefore = await findMessageBefore(channel, inter, interaction.client);
			if (messageBefore) messageId = messageBefore.id;
		}
		const res = defaultMsg.context({
			guildId: interaction.guild.id,
			channelId: channel.id,
			messageId,
		}).result;
		await rolLog.edit(res);
	}
	if (!disableThread) await deleteAfter(inter, timer);
	return;
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
	const comments = options.getString(t("dbRoll.options.comments.name")) ?? "";
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
			ephemeral: true,
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

	if (dollarValue) {
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
	const roll = `${dice.trimAll()}${modificatorString}${comparator} ${comments}`;
	await rollWithInteraction(
		interaction,
		roll,
		interaction.channel as Djs.TextBasedChannel,
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
		await reply(interaction, { content: ul("error.excludedStat"), ephemeral: true });
		return;
	}
	//model : {dice}{stats only if not comparator formula}{bonus/malus}{formula}{override/comparator}{comments}
	const comments = options.getString(t("dbRoll.options.comments.name")) ?? "";
	const override = options.getString(t("dbRoll.options.override.name"));
	const modification = options.getString(t("dbRoll.options.modificator.name")) ?? "0";

	let userStat = userStatistique.stats?.[standardizedStatistic];
	// noinspection LoopStatementThatDoesntLoopJS
	while (!userStat) {
		const guildData = client.settings.get(interaction.guild!.id, "templateID.statsName");
		if (userStatistique.stats && guildData) {
			const findStatInList = guildData.find((stat) =>
				stat.subText(standardizedStatistic)
			);
			if (findStatInList) {
				standardizedStatistic = findStatInList.standardize(true);
				statistic = findStatInList;
				userStat = userStatistique.stats[findStatInList.standardize(true)];
			}
		}
		if (userStat) break;
		throw new Error(
			ul("error.noStat", {
				stat: standardizedStatistic.capitalize(),
				char: optionChar ? ` ${optionChar.capitalize()}` : "",
			})
		);
	}
	const template = userStatistique.template;
	let dice = template.diceType?.replaceAll("$", userStat.toString());
	if (!dice) {
		await reply(interaction, { content: ul("error.noDice"), ephemeral: true });
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
	const roll = `${replaceFormulaInDice(dice).trimAll()}${modificationString}${generateStatsDice(comparator, userStatistique.stats, userStat.toString())} ${comments}`;
	const customCritical = template.customCritical
		? rollCustomCritical(template.customCritical, userStat, userStatistique.stats)
		: undefined;
	await rollWithInteraction(
		interaction,
		roll,
		interaction!.channel as Djs.TextBasedChannel,
		client.settings,
		template.critical,
		user,
		optionChar,
		{ name: statistic, standardized: standardizedStatistic },
		hideResult,
		customCritical
	);
}
