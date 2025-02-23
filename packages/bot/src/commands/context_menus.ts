import { cmdLn, t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { getLangAndConfig } from "../utils";

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
	const { ul } = getLangAndConfig(client.settings, interaction);
	if (interaction.targetMessage.author.id !== client.user?.id) {
		await interaction.reply({
			content: ul("copyRollResult.error.notBot"),
		});
		return;
	}
	const message = interaction.targetMessage.content;
	const messageUrl = interaction.targetMessage.url;

	const link = await finalLink(message, messageUrl, ul);
	if (!link) {
		await interaction.reply({
			content: ul("copyRollResult.error.noResult"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	await interaction.reply({
		content: `${ul("copyRollResult.info")}\n\n\`\`${link}\`\``,
		flags: Djs.MessageFlags.Ephemeral,
	});

	await interaction.followUp({
		content: `${link}`,
		flags: Djs.MessageFlags.Ephemeral,
	});
}

async function finalLink(message: string, messageUrl: string, ul: Translation) {
	const regexResultForRoll = /= `(?<result>.*)`/gi;
	const successFail = / {2}(?<compare>.*) — /gi;

	const list = message.split("\n");
	const res: string[] = [];
	for (const line of list) {
		if (!line.match(/^\s+/)) continue;
		const match = regexResultForRoll.exec(line)?.groups?.result;
		const compare = successFail.exec(line)?.groups?.compare;
		if (match && compare) res.push(`${compare.trim()} — \`${match.trim()}\``);
		else if (match) res.push(`\`${match.trim()}\``);
	}

	if (res.length === 0) return undefined;

	const statsReg = /\[__(?<stats>.*)__]/gi;
	const stats = statsReg.exec(message)?.groups?.stats;

	const regexSavedDice =
		/-# ↪ (?<saved>https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+)/gi;
	let savedDice = regexSavedDice.exec(message)?.groups?.saved;
	const generateMessage = `[[${stats ? `__${stats}__${ul("common.space")}: ` : ""}${res.join(" ; ")}]]`;
	if (!savedDice) savedDice = messageUrl;
	return `${generateMessage}(<${savedDice}>)`;
}

export async function mobileLink(interaction: Djs.ButtonInteraction, ul: Translation) {
	const message = interaction.message.content;
	const messageUrl = interaction.message.url;
	//check user mobile or desktop
	const link = await finalLink(message, messageUrl, ul);
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

export async function desktopLink(interaction: Djs.ButtonInteraction, ul: Translation) {
	const message = interaction.message.content;
	const messageUrl = interaction.message.url;
	const link = await finalLink(message, messageUrl, ul);
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
