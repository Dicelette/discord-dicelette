import { DETECT_CRITICAL, generateStatsDice } from "@dicelette/core";
import { t } from "@dicelette/localization";
import {
	extractDiceData,
	getComments,
	getCriticalFromDice,
	getExpression,
	parseOpposition,
	skillCustomCritical,
	trimAll,
} from "@dicelette/parse_result";
import type { RollOptions, Snippets } from "@dicelette/types";
import { DICE_PATTERNS } from "@dicelette/types"; // ajout patterns pour nettoyage
import { capitalizeBetweenPunct } from "@dicelette/utils";
import type { EClient } from "client";
import * as Djs from "discord.js";
import {
	calculateSimilarity,
	getLangAndConfig,
	getThreshold,
	macroOptions,
	rollWithInteraction,
} from "utils";

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
		if (dice.match(/ @\w+/)) {
			charOptions = dice.match(/ @(\w+)/)![1];
			dice = dice.replace(/ @\w+/, "").trim();
		}
		const expr = getExpression(dice, expressionOpt);
		dice = expr.dice;
		const expressionStr = expr.expressionStr;
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
			dice = getThreshold(dice, threshold);

			const opts: RollOptions = {
				customCritical: skillCustomCritical(rCCShared),
				user: interaction.user,
			};
			await rollWithInteraction(interaction, dice, client, opts);
			return;
		}

		const { cleanedDice: diceWithoutComments, mergedComments } = extractAndMergeComments(
			dice,
			userComments
		);
		let processedDice = generateStatsDice(diceWithoutComments);
		const rCC = getCriticalFromDice(processedDice, ul);
		processedDice = processedDice.replaceAll(DETECT_CRITICAL, "").trim();
		processedDice = getThreshold(processedDice, threshold);

		const comparatorMatch = /(?<sign>[><=!]+)(?<comparator>(.+))/.exec(processedDice);
		let comparator = "";
		if (comparatorMatch) {
			processedDice = processedDice.replace(comparatorMatch[0], "");
			comparator = comparatorMatch[0];
		}
		comparator = generateStatsDice(comparator);

		const opposition = oppositionVal
			? parseOpposition(oppositionVal, comparator)
			: undefined;
		const roll = `${trimAll(processedDice)}${expressionStr}${comparator}${
			mergedComments ? ` ${mergedComments}` : ""
		}`.trim();
		const opts: RollOptions = {
			charName: charOptions,
			customCritical: skillCustomCritical(rCC),
			opposition,
			user: interaction.user,
		};
		await rollWithInteraction(interaction, roll, client, opts);
	},
};

function fixSharedBracketSpacing(value: string) {
	return value.replace(/(&[^;]*?)(\[)/g, (_all, seg, bracket) => {
		return seg.endsWith(" ") ? `${seg}${bracket}` : `${seg} ${bracket}`;
	});
}

function extractAndMergeComments(
	dice: string,
	userComments?: string
): { cleanedDice: string; mergedComments?: string } {
	const isShared = dice.includes(";");
	const globalRaw = getComments(dice);
	const diceData = extractDiceData(dice);
	let tailComments = diceData.comments;
	if (tailComments && globalRaw && tailComments === globalRaw) tailComments = undefined;

	function stripMeta(c?: string) {
		if (!c) return undefined;
		return c.replace(/^# ?/, "").trim();
	}

	const partsRaw = [globalRaw, tailComments, userComments];
	const statsMarkers: string[] = [];
	const commentTexts: string[] = [];
	for (const part of partsRaw) {
		if (!part || !part.trim().length) continue;
		const markers = part.match(/%%\[__.*?__]%%/g) ?? [];
		for (const m of markers) if (!statsMarkers.includes(m)) statsMarkers.push(m);
		const cleanedPart = stripMeta(part.replace(/%%\[__.*?__]%%/g, "").trim());
		if (cleanedPart && cleanedPart.length > 0) commentTexts.push(cleanedPart);
	}

	const uniqueComments: string[] = [];
	for (const c of commentTexts) {
		if (!uniqueComments.includes(c)) uniqueComments.push(c);
	}

	let merged = `${statsMarkers.join(" ")} ${uniqueComments.join(" ")}`.trim();
	if (merged.length === 0) merged = "";

	let cleaned = dice
		.replace(/%%\[__.*?__]%%/g, "")
		.replace(DICE_PATTERNS.GLOBAL_COMMENTS, "")
		.trim();
	if (DICE_PATTERNS.DETECT_DICE_MESSAGE.test(cleaned)) {
		const simple = cleaned.match(DICE_PATTERNS.DETECT_DICE_MESSAGE);
		if (simple?.[1] && simple?.[3])
			cleaned = cleaned.replace(DICE_PATTERNS.DETECT_DICE_MESSAGE, "$1").trim();
	}
	if (merged) {
		if (isShared && !merged.startsWith("#")) merged = `# ${merged}`;
		if (!isShared && merged.startsWith("#")) merged = merged.replace(/^# ?/, "").trim();
	}

	return { cleanedDice: cleaned, mergedComments: merged || undefined };
}

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
