import { autoCompleteCharacters, calcOptions } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { generateStatsDice, isNumber } from "@dicelette/core";
import { ln, t } from "@dicelette/localization";
import { getRoll, timestamp } from "@dicelette/parse_result";
import { EMOJI_MATH, type Translation, type UserData } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import { getRightValue, getStatistics } from "database";
import * as Djs from "discord.js";
import { evaluate } from "mathjs";
import { embedError, sendResult } from "messages";
import "discord_ext";
import { capitalizeBetweenPunct } from "@dicelette/utils";

export async function autocompleteCalc(
	interaction: Djs.AutocompleteInteraction,
	client: EClient
) {
	const filter = autoCompleteCharacters(interaction, client, false) ?? [];
	const sign = autoFocuseSign(interaction);
	if (sign) return await interaction.respond(sign);
	const transform = autofocusTransform(interaction, interaction.locale);
	if (transform) return await interaction.respond(transform);
	return await interaction.respond(
		filter.map((result) => ({
			name: capitalizeBetweenPunct(result.capitalize()),
			value: result,
		}))
	);
}

export const calc = {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		return await autocompleteCalc(interaction, client);
	},
	data: (calcOptions(new Djs.SlashCommandBuilder()) as Djs.SlashCommandBuilder)
		.setNames("calc.title")
		.setDescriptions("calc.description")
		.setDefaultMemberPermissions(0),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild || !interaction.channel) return;
		const { userStatistique, options, ul, optionChar } =
			(await getStatistics(interaction, client)) ?? {};
		if (!userStatistique || !ul || !options) return;
		return await calculate(options, ul, interaction, client, userStatistique, optionChar);
	},
};

export function autofocusTransform(
	interaction: Djs.AutocompleteInteraction,
	lang: Djs.Locale
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const focused = options.getFocused(true);
	const ul = ln(lang);
	if (focused.name === t("calc.transform.title")) {
		const keys = ["abs", "ceil", "floor", "round", "sqrt", "square"];
		return keys
			.map((k) => ({
				name: ul(`calc.transform.${k}`),
				value: k,
			}))
			.filter(({ name }) => name.toLowerCase().includes(focused.value.toLowerCase()));
	}
	return;
}

export function autoFocuseSign(interaction: Djs.AutocompleteInteraction) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const focused = options.getFocused(true);
	if (focused.name === t("calc.sign.title")) {
		const signs = [
			"+",
			"-",
			"*",
			"/",
			"%",
			"^",
			"<",
			">",
			"⩽ (<=)",
			"⩾ (>=)",
			"= (==)",
			"≠ (!=)",
		].filter((sign) => sign.includes(focused.value));
		return signs.map((sign) => ({
			name: sign,
			value: reverseSign(sign),
		}));
	}
	return;
}

function reverseSign(sign: string) {
	switch (sign) {
		case "⩽ (<=)":
			return "<=";
		case "⩾ (>=)":
			return ">=";
		case "≠ (!=)":
			return "!=";
		case "= (==)":
			return "==";
		default:
			return sign;
	}
}

/**
 * Evaluates a mathematical or comparison expression using user statistics and returns the formatted result to the Discord interaction.
 *
 * Retrieves the relevant statistic value, processes the input formula (including dice rolls and optional transformations), evaluates the expression, and sends a localized, formatted result message. Handles invalid signs and evaluation errors by replying with an error embed.
 *
 * @param options - The command interaction options containing the formula, sign, statistic, and optional transform or comments.
 * @param userStatistique - The user's statistics used for variable substitution in the formula.
 * @param ul - The translation utility for localization.
 * @param interaction - The Discord command interaction context.
 * @param client
 * @param optionChar - Optional character name for display in the result.
 * @param hide - Whether to hide the result from other users.
 * @param user - The Discord user to mention in the result; defaults to the interaction user.
 *
 * @returns A promise that resolves when the result or error message has been sent to the user.
 */
export async function calculate(
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation,
	interaction: Djs.CommandInteraction,
	client: EClient,
	userStatistique?: UserData,
	optionChar?: string,
	hide?: boolean | null,
	user: Djs.User = interaction.user
) {
	let formula = options
		.getString(t("common.expression"), true)
		.replace(/^([><]=?|==|!=|[+*/%^])/, "");

	let originalFormula = formula;
	let totalFormula = formula;

	let statInfo:
		| {
				value: number | undefined;
				stat: string;
				name: string;
		  }
		| undefined;
	let needFormat = true;
	if (userStatistique) {
		const sign = options.getString(t("calc.sign.title"), true);
		if (sign === "-" && formula.match(/^-/)) formula = formula.replace(/^-/, "");
		if (!sign.match(/^([><]=?|==|!=|[+\-*/%^])$/)) {
			const embed = embedError(ul("error.sign", { sign }), ul);
			return await interaction.reply({ embeds: [embed] });
		}
		statInfo = {
			name: options.getString(t("common.statistic"), true),
			stat: options.getString(t("common.statistic"), true).standardize(),
			value: undefined,
		};
		const rightValue = getRightValue(
			userStatistique,
			statInfo.stat,
			ul,
			client,
			interaction.guild!,
			optionChar,
			statInfo.name
		);
		if (!rightValue) return;
		statInfo.value = rightValue.userStat;
		statInfo.name = rightValue.statistic;
		statInfo.stat = rightValue.standardizedStatistic;
		let formulaWithStats = generateStatsDice(
			formula,
			userStatistique.stats,
			`${statInfo.value}`
		);
		const isRoll = getRoll(formulaWithStats);
		originalFormula = `${statInfo.value}${sign}(${formula})`;
		if (isNumber(formula)) originalFormula = `${statInfo.value}${sign}${formula}`;
		if (isRoll?.total != null) {
			formulaWithStats = isRoll.total.toString();
			originalFormula = `${statInfo.value}${sign}(${formula}) → ${statInfo.value}${sign}(${isRoll.result})`;
		}
		totalFormula = `${statInfo.value}${sign}(${formulaWithStats})`;
		if (isNumber(formulaWithStats))
			totalFormula = `${statInfo.value}${sign}${formulaWithStats}`;
	} else {
		const isRoll = getRoll(formula);
		if (isRoll?.total != null) {
			originalFormula = isRoll.result;
			totalFormula = isRoll.total.toString();
			needFormat = false;
		}
	}
	const comments = options.getString(t("common.comments")) ?? undefined;
	try {
		const result = evaluate(totalFormula);
		const transform = options.getString(t("calc.transform.title")) ?? undefined;
		const header = infoUserCalc(
			client.settings.get(interaction.guildId!, "timestamp") ?? false,
			{
				guildId: interaction.guildId!,
				ul,
				userId: interaction.user.id,
			},
			statInfo?.name,
			comments,
			optionChar
		);

		const msg = needFormat
			? formatFormula(ul, totalFormula, `${result}`, originalFormula, transform)
			: formatDiceResult(originalFormula);
		const toSend = `${header}\n${msg}`;
		return await sendResult(
			interaction,
			{ expression: toSend },
			client.settings,
			ul,
			user,
			hide
		);
	} catch (error) {
		const embed = embedError((error as Error).message ?? ul("error.calc"), ul);
		await interaction.reply({ embeds: [embed] });
		logger.warn(error);
	}
}

function formatDiceResult(input: string) {
	const [expressionPart, resultPartRaw] = input.split(":").map((s) => s.trim());
	const [rolls, total] = resultPartRaw.split("=").map((s) => s.trim());
	return `\`${expressionPart}\` → \`${rolls}\` = \`${total}\``;
}

function infoUserCalc(
	time: boolean,
	data: { guildId: string; userId: string; ul: Translation },
	stat?: string,
	comments?: string,
	charName?: string
) {
	let mentionUser = `<@${data.userId}>`;
	const titleCharName = `__**${charName?.capitalize()}**__`;
	mentionUser = charName ? `${titleCharName} (${mentionUser})` : mentionUser;
	let user = mentionUser;
	if (time) user += `${timestamp(time)}`;
	if (user.trim().length > 0) user += `${data.ul("common.space")}:\n`;
	return `${user}${EMOJI_MATH}[__${stat ? stat.capitalize() : data.ul("math.result")}__]${comments ? ` *${comments}*` : ""}`;
}

function asciiSign(sign: string) {
	if (sign === "!=") return " ≠ ";
	if (sign === "==") return " = ";
	if (sign === ">=") return " ⩾ ";
	if (sign === "<=") return " ⩽ ";
	return sign;
}

function goodSign(sign: string) {
	switch (sign) {
		case "≠":
			return " = ";
		case "!=":
			return " = ";
		case "⩾":
			return " ⩽ ";
		case ">=":
			return " ⩽ ";
		case "⩽":
			return " ⩾ ";
		case "<=":
			return " ⩾ ";
		case "=":
			return " ≠ ";
		case "==":
			return " ≠ ";
		case ">":
			return " < ";
		case " < ":
			return " > ";
		default:
			return sign;
	}
}

function multipleTransform(transform: string, res: string) {
	const regex = /(?<exp1>\w+)\(?(?<exp2>\w+)?\(?\)?\)?/;
	const match = regex.exec(transform);
	if (!match) return `${transform}(${res})`;
	const exp1 = match.groups?.exp1;
	const exp2 = match.groups?.exp2;
	if (exp1 && !exp2) return `${exp1}(${res})`;
	if (exp1 && exp2) return `${exp1}(${exp2}(${res}))`;
	return `${transform}(${res})`;
}

function formatFormula(
	ul: Translation,
	formula: string,
	resultat: string,
	originalFormula: string,
	transform?: string
) {
	const sign = originalFormula.match(/(!=|==|>=|<=)/g);
	if (sign) {
		originalFormula = originalFormula.replace(sign[0], asciiSign(sign[0]));
		formula = formula.replace(sign[0], asciiSign(sign[0]));
	}

	let res = `\t  \`${originalFormula}\` → \`${formula}\``;
	if (originalFormula === formula) res = `\t  \`${formula}\``;
	if (isNumber(resultat)) {
		if (transform) {
			const formatted = multipleTransform(transform, resultat);
			const transformValue = evaluate(formatted);
			return `${res} → \`${formatted}\` = \`${transformValue}\``;
		}
		return `${res} = \`${resultat}\``;
	}
	if (resultat.toLowerCase() === "false") {
		if (sign) formula = formula.replace(asciiSign(sign[0]), goodSign(sign[0]));
		return `\t  ${ul("common.false")}${ul("common.space")}: \`${originalFormula}\` → \`${formula}\``;
	}
	if (resultat.toLowerCase() === "true")
		return `\t  ${ul("common.true")}${ul("common.space")}: ${res.trimStart()}`;
}
