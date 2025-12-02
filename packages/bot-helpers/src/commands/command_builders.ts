import type * as Djs from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
// Type-only local augmentation comment: runtime augmentation lives in bot package.

/**
 * Adds user + character options (display or edit mode)
 */
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
 * Adds common character, expression, threshold, opposition, comments options
 */
export function commonOptions(
	builder: Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder,
	opts: Partial<{
		expression: boolean;
		threshold: boolean;
		opposition: boolean;
		character: boolean;
	}> = {
		character: true,
		expression: true,
	}
) {
	if (opts.character)
		builder.addStringOption((option) =>
			option
				.setNames("common.character")
				.setDescriptions("dbRoll.options.character")
				.setRequired(false)
				.setAutocomplete(true)
		);
	if (opts.expression)
		builder.addStringOption((option) =>
			option
				.setNames("common.expression")
				.setDescriptions("dbRoll.options.modificator.description")
				.setRequired(false)
		);

	if (opts.opposition)
		builder.addStringOption((option) =>
			option
				.setNames("dbRoll.options.opposition.name")
				.setDescriptions("dbRoll.options.opposition.description")
				.setRequired(false)
		);

	if (opts.threshold)
		builder.addStringOption((option) =>
			option
				.setNames("dbRoll.options.override.name")
				.setDescriptions("dbRoll.options.override.description")
				.setRequired(false)
		);

	builder.addStringOption((option) =>
		option
			.setNames("common.comments")
			.setDescriptions("dbRoll.options.comments.description")
			.setRequired(false)
	);
	return builder;
}

/**
 * Macro builder options
 */
export function macroOptions(
	builder: Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder,
	character = true
): Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandBuilder {
	builder.addStringOption((option) =>
		option
			.setNames("common.name")
			.setDescriptions("rAtq.atq_name.description")
			.setRequired(true)
			.setAutocomplete(true)
	);
	return commonOptions(builder, {
		character,
		expression: true,
		opposition: true,
		threshold: true,
	});
}

/**
 * dbRoll builder options
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
	return commonOptions(builder, {
		character: true,
		expression: true,
		opposition: true,
		threshold: true,
	});
}

/**
 * Calculation builder options
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
	return commonOptions(builder, { character: true, expression: false });
}

/**
 * GM common options (adds hidden + user option)
 */
export function gmCommonOptions(
	builder: Djs.SlashCommandSubcommandBuilder,
	type: "dbroll" | "macro" | "calc" | "roll"
) {
	let builderCopy = builder;
	function addHiddenOpts(
		builderInner: SlashCommandSubcommandBuilder
	): Djs.SlashCommandSubcommandBuilder {
		builderInner.addBooleanOption((option) =>
			option
				.setNames("dbRoll.options.hidden.name")
				.setDescriptions("dbRoll.options.hidden.description")
				.setRequired(false)
		);
		return builderInner;
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
		case "roll": {
			builderCopy = addHiddenOpts(
				builder.addStringOption((option) =>
					option
						.setNames("common.dice")
						.setDescriptions("roll.option.description")
						.setRequired(true)
				)
			) as Djs.SlashCommandSubcommandBuilder;

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
