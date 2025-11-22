import { cmdLn, t } from "@dicelette/localization";
import {
	DEFAULT_TEMPLATE,
	type TemplateResult,
	type Translation,
} from "@dicelette/types";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { getLangAndConfig } from "utils";

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

type ShortLong = { long: string; short: string };

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

function renderTemplate(template: string, context: Record<string, unknown>) {
	return template.replace(/\{\{([^}]+)\}\}/g, (_, inner: string) => {
		const parts = inner.split(":").map((p) => p.trim());
		if (!parts.length) return "";

		const [rawVar, ...mods] = parts;
		const varName = rawVar.toLowerCase();

		const valueRaw = context[varName];
		if (valueRaw == null) return "";

		let value: string | ShortLong;

		if (typeof valueRaw === "object" && "long" in valueRaw && "short" in valueRaw)
			value = valueRaw as ShortLong;
		else
			value = String(valueRaw)
				.replaceAll("`", "")
				.replaceAll("*", "")
				.replaceAll("_", "");

		const ensureString = (): string => {
			if (typeof value === "string") return value;
			return (value as ShortLong).long;
		};

		for (const mod of mods) {
			const m = mod.toLowerCase();

			if (m === "short") {
				if (typeof value === "string") value = short(value);
				else value = (value as ShortLong).short;
				continue;
			}

			if (m === "long") {
				if (typeof value === "object") value = (value as ShortLong).long;
				continue;
			}

			let str = ensureString();

			if (m === "upper") str = str.toUpperCase();
			else if (m === "lower") str = str.toLowerCase();
			else if (m === "title") str = str.toTitle();
			else if (m === "standardize") str = str.removeAccents();
			else if (m.startsWith("trunc=")) {
				const truncMatch = m.match(/trunc=(\d+)/);
				if (truncMatch) {
					const maxLength = Number.parseInt(truncMatch[1], 10);
					if (str.length > maxLength) str = str.slice(0, maxLength);
				}
			}

			value = str;
		}

		return typeof value === "string" ? value : (value as ShortLong).long;
	});
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

	const context: Record<string, unknown> = {
		link: variables.link,
		results: resultsText,
	};

	if (variables.name) {
		const nameCtx: Record<string, unknown> = {
			name: getShortLong(variables.name),
		};
		context.name = renderTemplate(template.format.name, nameCtx);
	} else context.name = "";

	if (variables.character) {
		const charCtx: Record<string, unknown> = {
			character: getShortLong(variables.character),
		};
		context.character = renderTemplate(template.format.character, charCtx);
	} else context.character = "";

	return renderTemplate(template.final, context);
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

		const infoContext = infoTrim ? getShortLong(infoTrim) : { long: "", short: "" };

		const baseContext: Record<string, unknown> = {
			dice: diceTrim,
			info: infoContext,
			originalDice: originalTrim,
		};

		const infoFinal = infoTrim ? renderTemplate(fmt.info, baseContext).trim() : "";
		const resultFinal = diceTrim ? renderTemplate(fmt.dice, baseContext).trim() : "";
		const originalDiceText = originalTrim
			? fmt.originalDice
				? renderTemplate(fmt.originalDice, baseContext).trim()
				: ""
			: "";

		const lineContext: Record<string, unknown> = {
			dice: resultFinal,
			info: infoFinal,
			originalDice: originalDiceText,
		};

		return renderTemplate(template!.results, lineContext).trim();
	});

	return rollsText.join(template!.joinResult);
}

function short(text: string): string {
	const cleaned = text.replaceAll("**", "").trim();
	if (!cleaned) return "";
	const parts = cleaned.split(/\W+/);
	if (parts.length === 1) return cleaned;
	return parts.map((w) => w.charAt(0).toUpperCase()).join("");
}

function getShortLong(text: string): ShortLong {
	return {
		/** Complet */
		long: text,
		/** Initial only if word > 1, like Foo Bar = FB and Foo will be Foo */
		short: short(text),
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
