import { cmdLn, t } from "@dicelette/localization";
import {
	DEFAULT_TEMPLATE,
	LinksVariables,
	type TemplateResult,
	type Translation,
} from "@dicelette/types";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { getLangAndConfig } from "../utils";

type Results = {
	info: string;
	dice: string;
	original?: string;
};

type Variables = {
	rolls: Results[];
	name?: string;
	link: string;
	character?: string;
};

export const contextMenus = [
	new Djs.ContextMenuCommandBuilder()
		.setName(t("copyRollResult.name"))
		.setNameLocalizations(cmdLn("copyRollResult.name"))
		.setContexts(Djs.InteractionContextType.Guild)
		.setType(Djs.ApplicationCommandType.Message),
];
export async function commandMenu(
	interaction: Djs.MessageContextMenuCommandInteraction,
	client: EClient
) {
	const { ul } = getLangAndConfig(client, interaction);

	if (interaction.targetMessage.author.id !== client.user?.id) {
		await interaction.reply({
			content: ul("copyRollResult.error.notBot"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	const template = getTemplate(client, interaction);

	const message = interaction.targetMessage.content;
	const messageUrl = interaction.targetMessage.url;

	const link = finalLink(template, message, messageUrl);
	if (!link) {
		await interaction.reply({
			content: ul("copyRollResult.error.noResult"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	await interaction.reply({
		content: `\`\`${link}\`\``,
		flags: Djs.MessageFlags.Ephemeral,
	});
}

function replaceAllTokens(text: string, map: Record<string, string>) {
	return Object.entries(map).reduce((acc, [k, v]) => acc.replaceAll(k, v), text);
}

export function finalLink(
	template: TemplateResult | undefined,
	message: string,
	messageUrl: string
) {
	const variables = getVariablesTemplate(message, messageUrl);
	if (!variables) return undefined;
	template = template ?? DEFAULT_TEMPLATE;

	const resultsText = createResultFromTemplate(template, variables);

	let finalText = replaceAllTokens(template!.final, {
		[LinksVariables.LINK]: variables.link,
		[LinksVariables.RESULTS]: resultsText,
	});

	if (variables.name) {
		const statText = getShortLong(variables.name);
		const statFinal = replaceAllTokens(template!.format.name, {
			[LinksVariables.NAME]: statText.long,
			[LinksVariables.NAME_LONG]: statText.long,
			[LinksVariables.NAME_SHORT]: statText.short,
		});
		finalText = replaceAllTokens(finalText, {
			[LinksVariables.NAME]: statFinal,
			[LinksVariables.NAME_LONG]: statFinal,
			[LinksVariables.NAME_SHORT]: statFinal,
		});
	} else {
		finalText = replaceAllTokens(finalText, {
			[LinksVariables.NAME]: "",
			[LinksVariables.NAME_LONG]: "",
			[LinksVariables.NAME_SHORT]: "",
		});
	}

	if (variables.character) {
		const charText = getShortLong(variables.character);

		const formattedCharacter = replaceAllTokens(template!.format.character, {
			[LinksVariables.CHARACTER]: charText.long,
			[LinksVariables.CHARACTER_LONG]: charText.long,
			[LinksVariables.CHARACTER_SHORT]: charText.short,
		});

		finalText = replaceAllTokens(finalText, {
			[LinksVariables.CHARACTER]: formattedCharacter,
			[LinksVariables.CHARACTER_LONG]: formattedCharacter,
			[LinksVariables.CHARACTER_SHORT]: formattedCharacter,
		});
	} else {
		finalText = replaceAllTokens(finalText, {
			[LinksVariables.CHARACTER]: "",
			[LinksVariables.CHARACTER_LONG]: "",
			[LinksVariables.CHARACTER_SHORT]: "",
		});
	}

	return finalText;
}

function createResultFromTemplate(
	template: TemplateResult | undefined,
	variables: Variables
) {
	template = template ?? DEFAULT_TEMPLATE;
	const fmt = template!.format;

	const rollsText = variables.rolls.map(({ info, dice, original }) => {
		const infoTrim = info.trim();
		const diceTrim = dice.trim();
		const originalTrim = original ? original.trim() : "";

		const infoFinal = infoTrim
			? (() => {
					const c = getShortLong(infoTrim);
					return replaceAllTokens(fmt.info, {
						[LinksVariables.INFO]: c.long,
						[LinksVariables.INFO_LONG]: c.long,
						[LinksVariables.INFO_SHORT]: c.short,
					}).trim();
				})()
			: "";

		const resultFinal = diceTrim
			? fmt.dice.replace(LinksVariables.DICE, diceTrim).trim()
			: "";

		const originalDiceText = originalTrim
			? fmt.originalDice
				? fmt.originalDice.replace(LinksVariables.ORIGINAL_DICE, originalTrim).trim()
				: ""
			: "";

		return template!.results
			.replace(LinksVariables.INFO, infoFinal)
			.replaceAll(LinksVariables.INFO_LONG, infoFinal)
			.replaceAll(LinksVariables.INFO_SHORT, infoFinal)
			.replace(LinksVariables.DICE, resultFinal)
			.replaceAll(LinksVariables.ORIGINAL_DICE, originalDiceText)
			.trim();
	});

	return rollsText.join(template!.joinResult);
}

function getShortLong(text: string) {
	text = text.replaceAll("**", "").trim();
	const short =
		text.split(" ").length > 1
			? text
					.split(" ")
					.map((word) => word.charAt(0).toUpperCase())
					.join("")
			: text;
	return {
		/** Complet */
		long: text,
		/** Initial only if word > 1, like Foo Bar = FB and Foo will be Foo*/
		short,
	};
}

function getVariablesTemplate(message: string, messageUrl: string) {
	const regexResultForRoll = /= `(?<result>.*)`/gi;
	const successFail = /( {2}|_ _ )(?<info>.*) — /gi;
	const originalDice = /`(?<orig>.*?)` ⟶/gi;

	const list = message.split("\n");
	const variables: Results[] = [];
	for (const line of list) {
		if (!line.match(/^[\s_]+/)) continue;
		const dice = regexResultForRoll.exec(line)?.groups?.result;
		const info = successFail.exec(line)?.groups?.info;
		const original = originalDice.exec(line)?.groups?.orig;
		const vars: Results = {
			dice: dice ? dice.trim() : "",
			info: info ? info.trim() : "",
			original: original ? original.trim() : undefined,
		};
		if (vars.dice === "") continue;
		variables.push(vars);
	}
	if (variables.length === 0) return undefined;

	const nameReg = /\[__(?<name>.*)__]/gi;
	const name = nameReg.exec(message)?.groups?.name;
	const regexSavedDice =
		/-# ↪ (?<saved>https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+)/gi;
	const savedDice = regexSavedDice.exec(message)?.groups?.saved;

	const characterReg = /__\*\*(?<character>.*)\*\*__/gi;
	const character = characterReg.exec(message)?.groups?.character;

	return {
		character: character ? character : undefined,
		link: savedDice ?? messageUrl,
		name: name ? name : undefined,
		rolls: variables,
	};
}

function getTemplate(
	client: EClient,
	interaction: Djs.ButtonInteraction | Djs.MessageContextMenuCommandInteraction
) {
	const templateExportText = client.settings.get(
		interaction.guildId!,
		"createLinkTemplate"
	);
	const userTemplate = client.userSettings.get(
		interaction.guildId!,
		interaction.user.id
	)?.createLinkTemplate;
	return templateExportText ?? userTemplate ?? DEFAULT_TEMPLATE;
}

export async function mobileLink(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	client: EClient
) {
	const message = interaction.message.content;
	const messageUrl = interaction.message.url;
	const template = getTemplate(client, interaction);
	//check user mobile or desktop
	const link = finalLink(template, message, messageUrl);
	if (!link) {
		await interaction.reply({
			content: ul("copyRollResult.error.noResult"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	await interaction.reply({
		content: link,
		flags: Djs.MessageFlags.Ephemeral,
	});
}

export async function desktopLink(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	client: EClient
) {
	const template = getTemplate(client, interaction);
	const message = interaction.message.content;
	const messageUrl = interaction.message.url;
	const link = finalLink(template, message, messageUrl);
	if (!link) {
		await interaction.reply({
			content: ul("copyRollResult.error.noResult"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	await interaction.reply({
		content: `\`\`${link}\`\``,
		flags: Djs.MessageFlags.Ephemeral,
	});
}
