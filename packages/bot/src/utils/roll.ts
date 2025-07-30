import {
	type ComparedValue,
	type CustomCritical,
	DETECT_CRITICAL,
	generateStatsDice,
	replaceFormulaInDice,
} from "@dicelette/core";
import { t } from "@dicelette/localization";
import {
	convertNameToValue,
	getCriticalFromDice,
	getExpression,
	getRoll,
	parseOpposition,
	ResultAsText,
	replaceStatInDice,
	rollCustomCritical,
	rollCustomCriticalsFromDice,
	type Server,
	skillCustomCritical,
	trimAll,
} from "@dicelette/parse_result";
import type { Translation, UserData } from "@dicelette/types";
import { capitalizeBetweenPunct, logger } from "@dicelette/utils";
import type { EClient } from "client";
import { getRightValue, getUserFromMessage } from "database";
import * as Djs from "discord.js";
import { embedError, reply, sendResult } from "messages";
import { getLangAndConfig } from "utils";

/**
 * Calcule la similarité entre deux chaînes en utilisant la distance de Levenshtein normalisée
 */
function calculateSimilarity(str1: string, str2: string): number {
	const longer = str1.length > str2.length ? str1 : str2;
	const shorter = str1.length > str2.length ? str2 : str1;

	if (longer.length === 0) return 1.0;

	const distance = levenshteinDistance(longer, shorter);
	return (longer.length - distance) / longer.length;
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
function levenshteinDistance(str1: string, str2: string): number {
	const matrix = Array(str2.length + 1)
		.fill(null)
		.map(() => Array(str1.length + 1).fill(null));

	for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
	for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

	for (let j = 1; j <= str2.length; j++) {
		for (let i = 1; i <= str1.length; i++) {
			const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
			matrix[j][i] = Math.min(
				matrix[j][i - 1] + 1, // insertion
				matrix[j - 1][i] + 1, // deletion
				matrix[j - 1][i - 1] + cost // substitution
			);
		}
	}

	return matrix[str2.length][str1.length];
}

/**
 * Trouve le dé le plus similaire parmi tous les personnages du joueur
 */
async function findBestMatchingDice(
	client: EClient,
	interaction: Djs.CommandInteraction,
	userId: string,
	searchTerm: string,
	charOptions?: string
): Promise<{
	dice: string;
	attackName: string;
	charName?: string;
	similarity: number;
} | null> {
	const allUserData = client.settings.get(interaction.guild!.id, `user.${userId}`) ?? [];

	let bestMatch: {
		dice: string;
		attackName: string;
		charName?: string;
		similarity: number;
	} | null = null;
	let bestSimilarity = 0;
	const minSimilarity = 0.2; // Abaissement du seuil minimum de similarité

	for (const userData of allUserData) {
		if (charOptions) {
			const charNameMatches =
				userData.charName?.toLowerCase().includes(charOptions.toLowerCase()) ||
				userData.charName?.subText(charOptions);
			if (!charNameMatches) continue;
		}

		const damageName = userData.damageName ?? [];

		for (const atqName of damageName) {
			const standardizedAtq = atqName.standardize();
			const similarity = calculateSimilarity(searchTerm, standardizedAtq);

			if (similarity >= minSimilarity && similarity > bestSimilarity) {
				try {
					const specificUserData = await getUserFromMessage(
						client,
						userId,
						interaction,
						userData.charName?.standardize()
					);

					if (specificUserData?.damage) {
						const dice = specificUserData.damage[standardizedAtq];
						if (dice) {
							bestMatch = {
								dice,
								attackName: atqName,
								charName: userData.charName ?? undefined,
								similarity,
							};
							bestSimilarity = similarity;
						}
					}
				} catch (error) {
					logger.warn(`Error getting data for character "${userData.charName}":`, error);
				}
			}
		}
	}

	// Si aucun match avec charOptions, essayer sans le filtre de personnage
	if (!bestMatch && charOptions) {
		for (const userData of allUserData) {
			const damageName = userData.damageName ?? [];

			for (const atqName of damageName) {
				const standardizedAtq = atqName.standardize();
				const similarity = calculateSimilarity(searchTerm, standardizedAtq);

				if (similarity >= minSimilarity && similarity > bestSimilarity) {
					try {
						const specificUserData = await getUserFromMessage(
							client,
							userId,
							interaction,
							userData.charName?.standardize()
						);

						if (specificUserData?.damage) {
							const dice = specificUserData.damage[standardizedAtq];

							if (dice) {
								bestMatch = {
									dice,
									attackName: atqName,
									charName: userData.charName ?? undefined,
									similarity,
								};
								bestSimilarity = similarity;
							}
						}
					} catch (error) {
						logger.warn(
							`Error getting fallback data for character "${userData.charName}":`,
							error
						);
					}
				}
			}
		}
	}
	return bestMatch;
}

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
	opposition?: ComparedValue
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
		opposition
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
		hideResult
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
	// Recherche améliorée du dé le plus similaire parmi tous les personnages
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
	const rCC = getCriticalFromDice(dice, ul);
	dice = dice.replace(DETECT_CRITICAL, "").trim();
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
	const opposition = oppositionVal
		? parseOpposition(
				oppositionVal,
				comparator,
				userStatistique.stats,
				dollarValue?.total
			)
		: undefined;
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
			rCC || userStatistique.template.customCritical,
			userStatistique.stats,
			dollarValue?.total
		),
		opposition
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
	hideResult?: boolean | null
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
	const oppositionVal = options.getString(t("dbRoll.options.opposition.name"));
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
			if (simpleNumberMatch?.groups) {
				//if the override is a simple number, we replace the comparator with it
				dice = dice.replace(diceComparator, simpleNumberMatch.groups.comparator);
			}
		}
	}

	const userStatStr = userStat?.toString();
	const expr = getExpression(dice, expression, userStatistique.stats, userStatStr);
	dice = expr.dice;
	const expressionStr = expr.expressionStr;
	const rCc = rollCustomCriticalsFromDice(dice, ul, userStat, userStatistique.stats);
	dice = dice.replace(DETECT_CRITICAL, "").trim();

	const comparatorMatch = /([><=!]+)(.+)/.exec(dice);
	let comparator = "";
	if (comparatorMatch) {
		//remove from dice
		dice = dice.replace(comparatorMatch[0], "").trim();
		comparator = comparatorMatch[0];
	}
	const diceEvaluated = replaceFormulaInDice(dice);
	const opposition = oppositionVal
		? parseOpposition(oppositionVal, comparator, userStatistique.stats, userStatStr)
		: undefined;
	const roll = `${trimAll(diceEvaluated)}${expressionStr}${generateStatsDice(comparator, userStatistique.stats, userStatStr)} ${comments}`;
	const customCritical =
		rCc || rollCustomCritical(template.customCritical, userStat, userStatistique.stats);
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
		opposition
	);
}
