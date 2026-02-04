import {
	getInteractionContext as getLangAndConfig,
	getSettingsAutoComplete,
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
import type { RollOptions } from "@dicelette/types";
import {
	CHARACTER_DETECTION,
	DICE_COMPILED_PATTERNS,
	findBestSnippets,
} from "@dicelette/utils";
import * as Djs from "discord.js";
import { rollWithInteraction } from "utils";

export default {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const choices = getSettingsAutoComplete(interaction, client, "snippets");
		await interaction.respond(choices);
	},
	data: (macroOptions(new Djs.SlashCommandBuilder(), false) as Djs.SlashCommandBuilder)
		.setNames("common.snippets")
		.setContexts(Djs.InteractionContextType.Guild)
		.setIntegrationTypes(Djs.ApplicationIntegrationType.GuildInstall)
		.setDescriptions("snippets.description"),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const { ul } = getLangAndConfig(client, interaction);
		const userId = interaction.user.id;
		const guildId = interaction.guild!.id;
		const macroName = interaction.options.getString(t("common.name"), true).standardize();
		const userSettings = client.userSettings.get(guildId, userId);
		const snippets = userSettings?.snippets ?? {};
		const attributes = userSettings?.attributes;
		const expressionOpt = interaction.options.getString(t("common.expression")) ?? "0";
		const sortOrder = client.settings.get(guildId)?.sortOrder;
		const threshold = interaction.options
			.getString(t("dbRoll.options.override.name"))
			?.trimAll();

		const oppositionVal = interaction.options.getString(
			t("dbRoll.options.opposition.name")
		);
		const userComments = interaction.options.getString(t("common.comments")) ?? undefined;
		let dice = snippets[macroName];
		if (!dice) {
			const bestMatch = findBestSnippets(snippets, macroName);
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
				dice = `${generateStatsDice(before, attributes)} ${after}`.trim();
			} else dice = generateStatsDice(dice, attributes);

			const rCCShared = getCriticalFromDice(dice, ul);
			dice = dice.replace(DETECT_CRITICAL, "").trim();
			// Use shared getThreshold (now imported from utils/dice_compose)
			const composed = composeRollBase(
				dice,
				threshold,
				DICE_COMPILED_PATTERNS.COMPARATOR,
				attributes,
				undefined,
				"",
				""
			);

			const opts: RollOptions = {
				customCritical: skillCustomCritical(rCCShared, attributes, undefined, sortOrder),
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
		let processedDice = generateStatsDice(diceWithoutComments, attributes);
		const rCC = getCriticalFromDice(processedDice, ul);

		const targetValue = DICE_COMPILED_PATTERNS.TARGET_VALUE.exec(processedDice);
		if (targetValue?.groups) {
			const isDouble = DICE_COMPILED_PATTERNS.DOUBLE_TARGET.exec(processedDice);
			const { dice, comments } = targetValue.groups;
			if (isDouble?.groups?.dice) processedDice = dice.trim();
			else processedDice = `{${dice.trim()}}`;
			if (comments && comments.length > 0) processedDice += ` # ${comments.trim()}`;
		}
		// Use shared composeRollBase for dice composition
		const composed = composeRollBase(
			processedDice,
			threshold,
			DICE_COMPILED_PATTERNS.COMPARATOR,
			attributes,
			undefined,
			expressionStr,
			mergedComments ?? ""
		);

		const opposition = oppositionVal
			? parseOpposition(
					oppositionVal,
					composed.comparatorEvaluated,
					attributes,
					undefined,
					sortOrder
				)
			: undefined;

		const opts: RollOptions = {
			charName: charOptions,
			customCritical: skillCustomCritical(rCC, attributes, undefined, sortOrder),
			opposition,
			user: interaction.user,
		};
		await rollWithInteraction(interaction, composed.roll, client, opts);
	},
};
