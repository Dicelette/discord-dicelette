import { cmdLn, t } from "@dicelette/localization";
import { filterChoices } from "@dicelette/utils";
import type { EClient } from "client";
import type * as Djs from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";

import { getLangAndConfig } from "./fetch";

export function charUserOptions(
	buider: Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder
) {
	buider
		.addUserOption((option) =>
			option
				.setName(t("display.userLowercase"))
				.setNameLocalizations(cmdLn("display.userLowercase"))
				.setDescription(t("display.user"))
				.setDescriptionLocalizations(cmdLn("display.user"))
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName(t("common.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescription(t("display.character"))
				.setDescriptionLocalizations(cmdLn("display.character"))
				.setRequired(false)
				.setAutocomplete(true)
		);
	return buider;
}

/**
 * Adds common character, expression, threshold, and comments options to a Discord slash command builder.
 *
 * @param builder - The slash command builder to modify.
 * @param opts - Options to control inclusion of the expression and threshold fields.
 * @returns The builder with additional common options configured.
 */
export function commonOptions(
	builder: Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder,
	opts: Partial<{ expression: boolean; threshold: boolean }> = {
		expression: true,
	}
) {
	builder.addStringOption((option) =>
		option
			.setName(t("common.character"))
			.setDescription(t("dbRoll.options.character"))
			.setNameLocalizations(cmdLn("common.character"))
			.setDescriptionLocalizations(cmdLn("dbRoll.options.character"))
			.setRequired(false)
			.setAutocomplete(true)
	);
	if (opts.expression) {
		builder.addStringOption((option) =>
			option
				.setName(t("common.expression"))
				.setDescription(t("dbRoll.options.modificator.description"))
				.setNameLocalizations(cmdLn("common.expression"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.modificator.description"))
				.setRequired(false)
		);
	}
	if (opts.threshold) {
		builder.addStringOption((option) =>
			option
				.setName(t("dbRoll.options.override.name"))
				.setDescription(t("dbRoll.options.override.description"))
				.setNameLocalizations(cmdLn("dbRoll.options.override.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.override.description"))
				.setRequired(false)
		);
	}
	builder.addStringOption((option) =>
		option
			.setName(t("common.comments"))
			.setDescription(t("dbRoll.options.comments.description"))
			.setNameLocalizations(cmdLn("common.comments"))
			.setDescriptionLocalizations(cmdLn("dbRoll.options.comments.description"))
			.setRequired(false)
	);
	return builder;
}

export function dbdOptions(
	builder: Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder
): Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder {
	builder.addStringOption((option) =>
		option
			.setName(t("rAtq.atq_name.name"))
			.setNameLocalizations(cmdLn("rAtq.atq_name.name"))
			.setDescription(t("rAtq.atq_name.description"))
			.setDescriptionLocalizations(cmdLn("rAtq.atq_name.description"))
			.setRequired(true)
			.setAutocomplete(true)
	);
	return commonOptions(builder);
}

/**
 * Adds a non-required, autocompleted "statistic" string option to a Discord slash command builder, then appends common options including "expression", "threshold", and "comments".
 *
 * @returns The builder with the additional options configured.
 */
export function dbRollOptions(
	builder: Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder
) {
	builder.addStringOption((option) =>
		option
			.setName(t("common.statistic"))
			.setNameLocalizations(cmdLn("common.statistic"))
			.setDescription(t("dbRoll.options.statistic"))
			.setDescriptionLocalizations(cmdLn("dbRoll.options.statistic"))
			.setRequired(false)
			.setAutocomplete(true)
	);
	return commonOptions(builder, { expression: true, threshold: true });
}

/**
 * Adds calculation-related options to a Discord slash command builder.
 *
 * Adds required options for statistic, sign, and expression, as well as an optional transform option, all with localization and autocomplete where applicable. Also appends common options excluding the expression field.
 *
 * @returns The builder with calculation and common options configured.
 */
export function calcOptions(
	builder: Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder,
	isCalc = true
): Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder {
	if (isCalc) {
		builder
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
			);
	}
	builder.addStringOption((option) =>
		option
			.setName(t("common.expression"))
			.setDescription(t("calc.formula.desc"))
			.setNameLocalizations(cmdLn("common.expression"))
			.setDescriptionLocalizations(cmdLn("calc.formula.desc"))
			.setRequired(true)
	);
	if (isCalc)
		builder.addStringOption((option) =>
			option
				.setName(t("calc.transform.title"))
				.setDescription(t("calc.transform.desc"))
				.setRequired(false)
				.setNameLocalizations(cmdLn("calc.transform.title"))
				.setDescriptionLocalizations(cmdLn("calc.transform.desc"))
				.setAutocomplete(true)
		);
	return commonOptions(builder, { expression: false });
}

export function gmCommonOptions(
	builder: Djs.SlashCommandSubcommandBuilder,
	type: "dbroll" | "dbd" | "calc"
) {
	let builderCopy = builder;
	function addHiddenOpts(
		builder: SlashCommandSubcommandBuilder
	): Djs.SlashCommandSubcommandBuilder {
		builder.addBooleanOption((option) =>
			option
				.setName(t("dbRoll.options.hidden.name"))
				.setDescription(t("dbRoll.options.hidden.description"))
				.setNameLocalizations(cmdLn("dbRoll.options.hidden.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.hidden.description"))
				.setRequired(false)
		);
		return builder;
	}
	switch (type) {
		case "dbd": {
			builderCopy = addHiddenOpts(
				dbdOptions(builder) as Djs.SlashCommandSubcommandBuilder
			);
			break;
		}
		case "dbroll": {
			builderCopy = addHiddenOpts(
				dbRollOptions(builder) as Djs.SlashCommandSubcommandBuilder
			);
			break;
		}
		case "calc": {
			builderCopy = addHiddenOpts(
				calcOptions(builder) as Djs.SlashCommandSubcommandBuilder
			);
			break;
		}
		default:
			break;
	}
	builderCopy.addUserOption((option) =>
		option
			.setName(t("display.userLowercase"))
			.setNameLocalizations(cmdLn("display.userLowercase"))
			.setDescription(t("mjRoll.user"))
			.setDescriptionLocalizations(cmdLn("mjRoll.user"))
			.setRequired(false)
	);
	return builderCopy;
}
export function autoComplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const fixed = options.getFocused(true);
	const { ul, config: guildData } = getLangAndConfig(client, interaction);
	if (!guildData) return;
	const choices: string[] = [];
	let userID = options.get(t("display.userLowercase"))?.value ?? interaction.user.id;
	if (typeof userID !== "string") userID = interaction.user.id;
	return { fixed, guildData, choices, ul, userID };
}

export function autoCompleteCharacters(
	interaction: Djs.AutocompleteInteraction,
	client: EClient,
	exclude = true
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const focused = options.getFocused(true);
	const guildData = client.settings.get(interaction.guild!.id);
	if (!guildData || !guildData.templateID) return;
	let choices: string[] = [];

	if (focused.name === t("common.statistic")) {
		choices = guildData.templateID.statsName;
		if (exclude)
			choices = choices.filter(
				(item) => !guildData.templateID.excludedStats?.includes(item)
			);
	} else if (focused.name === t("common.character")) {
		//get user characters
		const userData = client.settings.get(
			interaction.guild!.id,
			`user.${interaction.user.id}`
		);
		if (!userData) return;
		choices = userData
			.map((data) => data.charName ?? "")
			.filter((data) => data.length > 0);
	}
	if (!choices || choices.length === 0) return;
	return filterChoices(choices, interaction.options.getFocused());
}
