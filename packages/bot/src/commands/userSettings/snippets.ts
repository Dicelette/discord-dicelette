import { getInteractionContext as getLangAndConfig } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { DiceTypeError } from "@dicelette/core";
import { t } from "@dicelette/localization";
import { getExpression } from "@dicelette/parse_result";
import type { Snippets, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { embedError, reply } from "messages";
import { baseRoll } from "../roll";

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
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
	} catch (error) {
		if (error instanceof DiceTypeError) {
			const text = ul("error.invalidDice.eval", { dice: error.dice });
			await reply(interaction, {
				embeds: [embedError(text, ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
		} else {
			const text = ul("error.generic.e", { message: (error as Error).message });
			await reply(interaction, {
				embeds: [embedError(text, ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
		}
	}
}

export async function chunkMessage(
	entries: [string, string | number][],
	ul: Translation,
	interaction: Djs.ChatInputCommandInteraction
) {
	const lines = entries.map(
		([name, content]) =>
			`- **${name.toTitle()}**${ul("common.space")}: \`${content.toString().replaceAll("`", "\\`")}\``
	);
	const chunkedLines: string[][] = [];
	const chunkSize = 10;
	for (let i = 0; i < lines.length; i += chunkSize) {
		chunkedLines.push(lines.slice(i, i + chunkSize));
	}
	//send the first message
	await reply(interaction, {
		content: chunkedLines[0].join("\n"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	//send the rest as follow ups
	for (const chunk of chunkedLines.slice(1)) {
		const text = chunk.join("\n");
		await interaction.followUp({ content: text, flags: Djs.MessageFlags.Ephemeral });
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
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	await chunkMessage(entries, ul, interaction);
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
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	delete macros[macroName];
	const key = `${userId}.snippets`;
	client.userSettings.set(guildId, macros, key);
	const text = ul("userSettings.snippets.delete.success", {
		name: `**${macroName.toTitle()}**`,
	});
	await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
}

export async function exportSnippets(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const macros = client.userSettings.get(guildId, userId)?.snippets ?? {};
	if (Object.keys(macros).length === 0) {
		const text = ul("userSettings.snippets.export.empty");
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	const fileContent = JSON.stringify(macros, null, 2);
	const buffer = Buffer.from(fileContent, "utf-8");
	const attachment = new Djs.AttachmentBuilder(buffer, {
		name: `snippets_${interaction.user.username}.json`,
	});
	await reply(interaction, {
		content: ul("userSettings.snippets.export.success"),
		files: [attachment],
		flags: Djs.MessageFlags.Ephemeral,
	});
}

export async function getContentFile(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const file = interaction.options.getAttachment(
		t("userSettings.snippets.import.file.title"),
		true
	);
	const overwrite = interaction.options.getBoolean(
		t("userSettings.snippets.import.overwrite.title")
	);
	if (!file.name.endsWith(".json")) {
		const text = ul("userSettings.snippets.import.invalidFile");
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	const response = await fetch(file.url);
	const fileContent = await response.text();
	return { fileContent, guildId, overwrite, ul, userId };
}

export function errorMessage(
	type: "expander" | "snippets",
	ul: Translation,
	errors: Record<string, unknown>,
	count: number
) {
	let text = ul(`userSettings.${type}.import.success`, { count });

	if (Object.keys(errors).length > 0) {
		const errorLines = Object.entries(errors)
			.map(
				([name, value]) => `- **${name.toTitle()}**${ul("common.space")}: \`${value}\``
			)
			.join("\n");
		text += `\n\n${ul(`userSettings.${type}.import.partialErrors`, { count: Object.keys(errors).length })}\n${errorLines}`;
	}
	return text;
}

export async function importSnippets(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const data = await getContentFile(client, interaction);
	if (!data) return;
	const { fileContent, guildId, overwrite, ul, userId } = data;
	let importedMacros: Record<string, unknown>;
	const ex: Record<string, string> = {
		anotherMacro: "1d20",
		testMacro: "2d6+3",
	};
	try {
		importedMacros = JSON.parse(fileContent);
	} catch {
		const text = ul("userSettings.snippets.import.invalidContent", {
			ex: JSON.stringify(ex, null, 2),
		});
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	if (typeof importedMacros !== "object" || Array.isArray(importedMacros)) {
		const text = ul("userSettings.snippets.import.invalidContent", {
			ex: JSON.stringify(ex, null, 2),
		});
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	const key = `${userId}.snippets`;
	let macros = client.userSettings.get(guildId, userId)?.snippets ?? {};
	if (overwrite) macros = {};
	//verify and merge the imported macros
	const errors: Snippets = {};
	let count = 0;
	for (const [name, content] of Object.entries(importedMacros)) {
		if (typeof content !== "string") {
			errors[name] = String(content);
			continue;
		}
		try {
			await baseRoll(getExpression(content, "0").dice, interaction, client, false, true);
			macros[name] = content;
			count += 1;
		} catch (error) {
			//skip invalid macros
			errors[name] = content;
		}
	}
	client.userSettings.set(guildId, macros, key);
	const text = errorMessage("snippets", ul, errors, count);
	await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
}
