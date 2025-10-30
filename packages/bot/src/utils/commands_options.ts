import { t } from "@dicelette/localization";
import { filterChoices } from "@dicelette/utils";
import type { EClient } from "client";
import type * as Djs from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import "discord_ext";
import { getLangAndConfig } from "./fetch";

export function charUserOptions(
	buider: Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder,
	type: "display" | "edit" = "display"
) {
	const keysPrefix = type === "display" ? "display" : "edit.opts";
	buider
		.addUserOption((option) =>
			option
				.setNames("display.userLowercase")
				.setDescriptions(`${keysPrefix}.user`)
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setNames("common.character")
				.setDescriptions(`${keysPrefix}.character`)
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
	opts: Partial<{ expression: boolean; threshold: boolean; opposition: boolean }> = {
		expression: true,
	}
) {
	builder.addStringOption((option) =>
		option
			.setNames("common.character")
			.setDescriptions("dbRoll.options.character")
			.setRequired(false)
			.setAutocomplete(true)
	);
	if (opts.expression) {
		builder.addStringOption((option) =>
			option
				.setNames("common.expression")
				.setDescriptions("dbRoll.options.modificator.description")
				.setRequired(false)
		);
	}
	if (opts.opposition) {
		builder.addStringOption((option) =>
			option
				.setNames("dbRoll.options.opposition.name")
				.setDescriptions("dbRoll.options.opposition.description")
				.setRequired(false)
		);
	}
	if (opts.threshold) {
		builder.addStringOption((option) =>
			option
				.setNames("dbRoll.options.override.name")
				.setDescriptions("dbRoll.options.override.description")
				.setRequired(false)
		);
	}
	builder.addStringOption((option) =>
		option
			.setNames("common.comments")
			.setDescriptions("dbRoll.options.comments.description")
			.setRequired(false)
	);
	return builder;
}

export function macroOptions(
	builder: Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder
): Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder {
	builder.addStringOption((option) =>
		option
			.setNames("common.name")
			.setDescriptions("rAtq.atq_name.description")
			.setRequired(true)
			.setAutocomplete(true)
	);
	return commonOptions(builder, { expression: true, opposition: true });
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
			.setNames("common.statistic")
			.setDescriptions("dbRoll.options.statistic")
			.setRequired(false)
			.setAutocomplete(true)
	);
	return commonOptions(builder, { expression: true, opposition: true, threshold: true });
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
					.setNames("common.statistic")
					.setDescriptions("calc.statistic")
					.setRequired(true)
					.setAutocomplete(true)
			)
			.addStringOption((option) =>
				option
					.setNames("calc.sign.title")
					.setDescriptions("calc.sign.desc")
					.setRequired(true)
					.setAutocomplete(true)
			);
	}
	builder.addStringOption((option) =>
		option
			.setNames("common.expression")
			.setDescriptions("calc.formula.desc")
			.setRequired(true)
	);
	if (isCalc)
		builder.addStringOption((option) =>
			option
				.setNames("calc.transform.title")
				.setDescriptions("calc.transform.desc")
				.setRequired(false)
				.setAutocomplete(true)
		);
	return commonOptions(builder, { expression: false });
}

export function gmCommonOptions(
	builder: Djs.SlashCommandSubcommandBuilder,
	type: "dbroll" | "macro" | "calc"
) {
	let builderCopy = builder;
	function addHiddenOpts(
		builder: SlashCommandSubcommandBuilder
	): Djs.SlashCommandSubcommandBuilder {
		builder.addBooleanOption((option) =>
			option
				.setNames("dbRoll.options.hidden.name")
				.setDescriptions("dbRoll.options.hidden.description")
				.setRequired(false)
		);
		return builder;
	}
	switch (type) {
		case "macro": {
			builderCopy = addHiddenOpts(
				macroOptions(builder) as Djs.SlashCommandSubcommandBuilder
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
			.setNames("display.userLowercase")
			.setDescriptions("mjRoll.user")
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
	return { choices, fixed, guildData, ul, userID };
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
