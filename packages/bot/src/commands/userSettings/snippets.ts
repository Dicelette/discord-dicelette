import { DiceTypeError } from "@dicelette/core";
import { t } from "@dicelette/localization";
import { getExpression } from "@dicelette/parse_result";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { getLangAndConfig, replyEphemeral, replyEphemeralError } from "utils";
import { baseRoll } from "../roll/base_roll";

export async function register(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const macroName = interaction.options.getString(t("common.name"), true);
	const diceValue = interaction.options.getString(t("common.dice"), true);
	try {
		await baseRoll(getExpression(diceValue, "0").dice, interaction, client, false, true);
		const macros = client.userSettings.get(guildId, userId)?.snippets ?? {};
		macros[macroName] = diceValue;
		const key = `${userId}.snippets`;
		client.userSettings.set(guildId, macros, key);
		const text = ul("userSettings.snippets.create.success", {
			name: macroName.toTitle(),
		});
		await replyEphemeral(interaction, text);
	} catch (error) {
		if (error instanceof DiceTypeError) {
			const text = ul("error.invalidDice.eval", { dice: error.dice });
			await replyEphemeralError(interaction, text, ul);
		} else {
			const text = ul("error.generic.e", { message: (error as Error).message });
			await replyEphemeralError(interaction, text, ul);
		}
	}
}

export async function displayList(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const macros = client.userSettings.get(guildId, userId)?.snippets ?? {};
	const entries = Object.entries(macros);
	if (entries.length === 0) {
		const text = ul("userSettings.snippets.list.empty");
		await replyEphemeral(interaction, text);
		return;
	}
	const lines = entries.map(
		([name, content]) =>
			`- **${name.toTitle()}**${ul("common.space")}: \`${content.replaceAll("`", "\\`")}\``
	);
	const chunkedLines: string[][] = [];
	const chunkSize = 10;
	for (let i = 0; i < lines.length; i += chunkSize) {
		chunkedLines.push(lines.slice(i, i + chunkSize));
	}
	//send the first message
	await interaction.reply({
		content: chunkedLines[0].join("\n"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	//send the rest as follow ups
	for (const chunk of chunkedLines.slice(1)) {
		const text = chunk.join("\n");
		await interaction.followUp({ content: text, flags: Djs.MessageFlags.Ephemeral });
	}
}

export async function remove(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const macroName = interaction.options.getString(t("common.name"), true);
	const macros = client.userSettings.get(guildId, userId)?.snippets ?? {};
	if (!macros[macroName]) {
		const text = ul("userSettings.snippets.delete.notFound", {
			name: `**${macroName.toTitle()}**`,
		});
		await replyEphemeral(interaction, text);
		return;
	}
	delete macros[macroName];
	const key = `${userId}.snippets`;
	client.userSettings.set(guildId, macros, key);
	const text = ul("userSettings.snippets.delete.success", {
		name: `**${macroName.toTitle()}**`,
	});
	await replyEphemeral(interaction, text);
}
