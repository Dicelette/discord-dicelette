import { generateStatsDice } from "@dicelette/core";
import { cmdLn, t } from "@dicelette/localization";
import { createUrl, getRoll, timestamp } from "@dicelette/parse_result";
import type { Translation, UserData } from "@dicelette/types";
import { capitalizeBetweenPunct, isNumber, logger } from "@dicelette/utils";
import type { EClient } from "client";
import { getRightValue, getStatistics } from "database";
import * as Djs from "discord.js";
import { evaluate } from "mathjs";
import {
	deleteAfter,
	embedError,
	findMessageBefore,
	reply,
	sendResult,
	threadToSend,
} from "messages";
import { autoCompleteCharacters, isValidChannel } from "utils";

export const calc = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("calc.title"))
		.setNameLocalizations(cmdLn("calc.title"))
		.setDescription(t("calc.description"))
		.setDefaultMemberPermissions(0)
		.setDescriptionLocalizations(cmdLn("calc.description"))
		.addStringOption((option) =>
			option
				.setName(t("common.statistic"))
				.setDescription(t("calc.statistic"))
				.setRequired(true)
				.setNameLocalizations(cmdLn("common.statistic"))
				.setDescriptionLocalizations(cmdLn("calc.statistic"))
				.setAutocomplete(true)
		)
		.addStringOption((option) =>
			option
				.setName(t("calc.sign.title"))
				.setDescription(t("calc.sign.desc"))
				.setRequired(true)
				.setNameLocalizations(cmdLn("calc.sign.title"))
				.setDescriptionLocalizations(cmdLn("calc.sign.desc"))
				.setAutocomplete(true)
		)
		.addStringOption((option) =>
			option
				.setName(t("calc.formula.title"))
				.setDescription(t("calc.formula.desc"))
				.setRequired(true)
				.setNameLocalizations(cmdLn("calc.formula.title"))
				.setDescriptionLocalizations(cmdLn("calc.formula.desc"))
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName(t("calc.transform.title"))
				.setDescription(t("calc.transform.desc"))
				.setRequired(false)
				.setNameLocalizations(cmdLn("calc.transform.title"))
				.setDescriptionLocalizations(cmdLn("calc.transform.desc"))
				.setAutocomplete(true)
		)
		.addStringOption((option) =>
			option
				.setName(t("common.character"))
				.setDescription(t("dbRoll.options.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.character"))
				.setRequired(false)
				.setAutocomplete(true)
		)
		.addStringOption((option) =>
			option
				.setName(t("dbRoll.options.comments.name"))
				.setDescription(t("dbRoll.options.comments.description"))
				.setNameLocalizations(cmdLn("dbRoll.options.comments.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.comments.description"))
				.setRequired(false)
		),
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const filter = autoCompleteCharacters(interaction, client, false) ?? [];
		const sign = autoFocuseSign(interaction);
		if (sign) return await interaction.respond(sign);
		const transform = autofocusTransform(interaction);
		if (transform) return await interaction.respond(transform);
		return await interaction.respond(
			filter.map((result) => ({
				name: capitalizeBetweenPunct(result.capitalize()),
				value: result,
			}))
		);
	},
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		if (!interaction.guild || !interaction.channel) return;
		const { userStatistique, options, ul, optionChar } =
			(await getStatistics(interaction, client)) ?? {};
		if (!userStatistique || !ul || !options) return;
		return await calculate(options, userStatistique, ul, interaction, client, optionChar);
	},
};

export function autofocusTransform(interaction: Djs.AutocompleteInteraction) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const focused = options.getFocused(true);
	if (focused.name === t("calc.transform.title")) {
		const transforms = ["abs", "ceil", "floor", "round", "sqrt", "square"].filter(
			(transform) => transform.includes(focused.value)
		);
		return transforms.map((transform) => ({
			name: transform,
			value: transform,
		}));
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

export async function calculate(
	options: Djs.CommandInteractionOptionResolver,
	userStatistique: UserData,
	ul: Translation,
	interaction: Djs.CommandInteraction,
	client: EClient,
	optionChar?: string,
	hide?: boolean | null,
	user: Djs.User = interaction.user
) {
	
	let formula = options
		.getString(t("calc.formula.title"), true)
		.replace(/^([><]=?|==|!=|[+*/%^])/, "");
	const sign = options.getString(t("calc.sign.title"), true);
	if (sign === "-" && formula.match(/^-/)) formula = formula.replace(/^-/, "");
	if (!sign.match(/^([><]=?|==|!=|[+\-*\/%^])$/)) {
		const embed = embedError(ul("error.sign", { sign }), ul);
		return await interaction.reply({ embeds: [embed] });
	}

	const statInfo: {
		value: number | undefined;
		stat: string;
		name: string;
	} = {
		value: undefined,
		stat: options.getString(t("common.statistic"), true).standardize(),
		name: options.getString(t("common.statistic"), true),
	};
	const rightValue = getRightValue(
		userStatistique,
		statInfo.stat,
		ul,
		client,
		interaction,
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
	logger.trace(`Calculation: ${formulaWithStats}`);
	const isRoll = getRoll(formulaWithStats);
	let originalFormula = `${statInfo.value}${sign}(${formula})`;
	if (isNumber(formula)) originalFormula = `${statInfo.value}${sign}${formula}`;
	if (isRoll?.total) {
		formulaWithStats = isRoll.total.toString();
		originalFormula = `${statInfo.value}${sign}(${formula}) → ${statInfo.value}${sign}(${isRoll.result})`;
	}
	formulaWithStats = evaluate(formulaWithStats);
	const comments = options.getString(t("dbRoll.options.comments.name")) ?? undefined;
	let totalFormula = `${statInfo.value}${sign}(${formulaWithStats})`;
	if (isNumber(formulaWithStats))
		totalFormula = `${statInfo.value}${sign}${formulaWithStats}`;
	try {
		const result = evaluate(totalFormula);
		const transform = options.getString(t("calc.transform.title")) ?? undefined;
		const header = infoUserCalc(
			client.settings.get(interaction.guildId!, "timestamp") ?? false,
			{
				guildId: interaction.guildId!,
				userId: interaction.user.id,
				ul,
			},
			statInfo.name,
			comments,
			optionChar
		);

		const msg = formatFormula(ul, totalFormula, `${result}`, originalFormula, transform);
		const toSend = `${header}\n${msg}`;
		return await sendResult(interaction, {expression: toSend}, client.settings, ul, user, hide);
	} catch (error) {
		const embed = embedError((error as Error).message ?? ul("error.calc"), ul);
		await interaction.reply({ embeds: [embed] });
	}
}

function infoUserCalc(
	time: boolean,
	data: { guildId: string; userId: string; ul: Translation },
	stat: string,
	comments?: string,
	charName?: string
) {
	let mentionUser = `<@${data.userId}>`;
	const titleCharName = `__**${charName?.capitalize()}**__`;
	mentionUser = charName ? `${titleCharName} (${mentionUser})` : mentionUser;
	let user = mentionUser;
	if (time) user += `${timestamp(time)}`;
	if (user.trim().length > 0) user += `${data.ul("common.space")}:\n`;
	return `${user}\\🔢[__${stat.capitalize()}__]${comments ? ` *${comments}*` : ""}`;
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
