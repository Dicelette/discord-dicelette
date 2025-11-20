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
};

type Variables = {
	rolls: Results[];
	stats?: string;
	link: string;
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

	if (variables.stats) {
		const statText = getShortLong(variables.stats);
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

	return finalText;
}

function createResultFromTemplate(
	template: TemplateResult | undefined,
	variables: Variables
) {
	template = template ?? DEFAULT_TEMPLATE;
	const fmt = template!.format;

	const rollsText = variables.rolls.map(({ info, dice }) => {
		const infoTrim = info.trim();
		const diceTrim = dice.trim();

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

		return template!.results
			.replace(LinksVariables.INFO, infoFinal)
			.replaceAll(LinksVariables.INFO_LONG, infoFinal)
			.replaceAll(LinksVariables.INFO_SHORT, infoFinal)
			.replace(LinksVariables.DICE, resultFinal)
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

	const list = message.split("\n");
	const variables: Results[] = [];
	for (const line of list) {
		if (!line.match(/^[\s_]+/)) continue;
		const match = regexResultForRoll.exec(line)?.groups?.result;
		const info = successFail.exec(line)?.groups?.info;
		if (match && info) variables.push({ dice: match.trim(), info: info.trim() });
		else if (match) variables.push({ dice: match.trim(), info: "" });
	}
	if (variables.length === 0) return undefined;

	const statsReg = /\[__(?<stats>.*)__]/gi;
	const stats = statsReg.exec(message)?.groups?.stats;
	const regexSavedDice =
		/-# ↪ (?<saved>https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+)/gi;
	const savedDice = regexSavedDice.exec(message)?.groups?.saved;

	return {
		link: savedDice ?? messageUrl,
		rolls: variables,
		stats: stats ? stats : undefined,
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
