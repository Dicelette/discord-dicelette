import {
	getInteractionContext as getLangAndConfig,
	macroOptions,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { DETECT_CRITICAL, generateStatsDice } from "@dicelette/core";
import { t } from "@dicelette/localization";
import {
	composeRollBase,
	extractAndMergeComments,
	getCriticalFromDice,
	getExpression,
	parseOpposition,
	skillCustomCritical,
} from "@dicelette/parse_result";
import type { RollOptions, Snippets } from "@dicelette/types";
import {
	CHARACTER_DETECTION,
	calculateSimilarity,
	capitalizeBetweenPunct,
	QUERY_URL_PATTERNS,
} from "@dicelette/utils";
import * as Djs from "discord.js";
import { rollWithInteraction } from "utils";

export function getSnippetAutocomplete(
	interaction: Djs.AutocompleteInteraction,
	client: EClient
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const focused = options.getFocused(true);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const macros = client.userSettings.get(guildId, userId)?.snippets ?? {};
	let choices: string[] = [];
	if (focused.name === "name") {
		const input = options.getString("name")?.standardize() ?? "";
		choices = Object.keys(macros).filter((macroName) => macroName.subText(input));
	}
	return choices;
}

export default {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const choices = getSnippetAutocomplete(interaction, client);
		await interaction.respond(
			choices.slice(0, 25).map((choice) => ({
				name: capitalizeBetweenPunct(choice.capitalize()),
				value: choice,
			}))
		);
	},
	data: (macroOptions(new Djs.SlashCommandBuilder(), false) as Djs.SlashCommandBuilder)
		.setNames("common.snippets")
		.setDescriptions("snippets.description"),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const { ul } = getLangAndConfig(client, interaction);
		const userId = interaction.user.id;
		const guildId = interaction.guild!.id;
		const macroName = interaction.options.getString(t("common.name"), true).standardize();
		const snippets = client.userSettings.get(guildId, userId)?.snippets ?? {};
		const expressionOpt = interaction.options.getString(t("common.expression")) ?? "0";
		const threshold = interaction.options
			.getString(t("dbRoll.options.override.name"))
			?.trimAll();

		const oppositionVal = interaction.options.getString(
			t("dbRoll.options.opposition.name")
		);
		const userComments = interaction.options.getString(t("common.comments")) ?? undefined;
		let dice = snippets[macroName];
		if (!dice) {
			const bestMatch = findBestMatch(snippets, macroName);
			if (bestMatch) dice = snippets[bestMatch];
		}
		if (!dice) {
			const text = ul("userSettings.snippets.delete.notFound", { name: macroName });
			await interaction.reply({ content: text, flags: Djs.MessageFlags.Ephemeral });
			return;
		}
		let charOptions: undefined | string;
		if (dice.match(CHARACTER_DETECTION)) {
			charOptions = dice.match(CHARACTER_DETECTION)![1];
			dice = dice.replace(CHARACTER_DETECTION, "").trim();
		}
		const expr = getExpression(dice, expressionOpt);
		dice = expr.dice;
		const expressionStr = expr.expressionStr;

		// Special case: shared dice notation with & and ; (multi-roll formula)
		if (dice.includes("&") && dice.includes(";")) {
			if (userComments) {
				if (!dice.includes("#")) dice = `${dice} # ${userComments}`;
				else dice = `${dice} ${userComments}`;
			}
			const hashIndex = dice.indexOf("#");
			if (hashIndex !== -1) {
				const before = dice.slice(0, hashIndex).trimEnd();
				const after = dice.slice(hashIndex);
				dice = `${generateStatsDice(before)} ${after}`.trim();
			} else dice = generateStatsDice(dice);

			const rCCShared = getCriticalFromDice(dice, ul);
			dice = dice.replace(DETECT_CRITICAL, "").trim();
			// Use shared getThreshold (now imported from utils/dice_compose)
			const composed = composeRollBase(
				dice,
				threshold,
				QUERY_URL_PATTERNS.COMPARATOR,
				undefined,
				undefined,
				"",
				""
			);

			const opts: RollOptions = {
				customCritical: skillCustomCritical(rCCShared),
				user: interaction.user,
			};
			await rollWithInteraction(interaction, composed.roll, client, opts);
			return;
		}

		// Standard case: single roll formula
		const { cleanedDice: diceWithoutComments, mergedComments } = extractAndMergeComments(
			dice,
			userComments
		);
		const processedDice = generateStatsDice(diceWithoutComments);
		const rCC = getCriticalFromDice(processedDice, ul);

		// Use shared composeRollBase for dice composition
		const composed = composeRollBase(
			processedDice,
			threshold,
			QUERY_URL_PATTERNS.COMPARATOR,
			undefined,
			undefined,
			expressionStr,
			mergedComments ?? ""
		);

		const opposition = oppositionVal
			? parseOpposition(oppositionVal, composed.comparatorEvaluated)
			: undefined;

		const opts: RollOptions = {
			charName: charOptions,
			customCritical: skillCustomCritical(rCC),
			opposition,
			user: interaction.user,
		};
		await rollWithInteraction(interaction, composed.roll, client, opts);
	},
};

function findBestMatch(snippets: Snippets, macroName: string): string | null {
	let bestMatch: string | null = null;
	let highestSimilarity = 0;

	for (const name of Object.keys(snippets)) {
		const similarity = calculateSimilarity(macroName, name);
		if (similarity > highestSimilarity) {
			highestSimilarity = similarity;
			bestMatch = name;
		}
	}
	return bestMatch;
}
