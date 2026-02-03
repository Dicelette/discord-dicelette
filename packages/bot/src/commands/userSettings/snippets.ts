import {
	buildJsonAttachment,
	chunkMessage,
	errorMessage,
	getContentFile,
	getInteractionContext as getLangAndConfig,
	processEntries,
	registerEntry,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import { getExpression, replaceStatsInDiceFormula } from "@dicelette/parse_result";
import * as Djs from "discord.js";
import { reply } from "messages";
import { baseRoll } from "../roll";

export async function register(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const macroName = interaction.options.getString(t("common.name"), true);
	const diceValue = interaction.options.getString(t("common.dice"), true);
	const attributes = client.userSettings.get(
		interaction.guild!.id,
		interaction.user.id
	)?.attributes;
	const dice = replaceStatsInDiceFormula(
		getExpression(diceValue, "0", attributes).dice,
		attributes
	);
	await baseRoll(dice.formula, interaction, client, false, true);
	// store using generic helper
	await registerEntry(
		client,
		interaction,
		"snippets",
		macroName,
		diceValue,
		ul,
		(name) => ({
			name: name.toTitle(),
		})
	);
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
	const attachment = buildJsonAttachment(
		macros,
		`snippets_${interaction.user.username}.json`
	);
	await reply(interaction, {
		content: ul("userSettings.snippets.export.success"),
		files: [attachment],
		flags: Djs.MessageFlags.Ephemeral,
	});
}

export async function importSnippets(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const data = await getContentFile(interaction, t, ul);
	if (!data) return;
	const { fileContent, guildId, overwrite, userId } = data;
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
	if (
		typeof importedMacros !== "object" ||
		Array.isArray(importedMacros) ||
		importedMacros === null
	) {
		const text = ul("userSettings.snippets.import.invalidContent", {
			ex: JSON.stringify(ex, null, 2),
		});
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	const key = `${userId}.snippets`;
	let macros = client.userSettings.get(guildId, userId)?.snippets ?? {};
	if (overwrite) macros = {};
	const attributes = client.userSettings.get(
		interaction.guild!.id,
		interaction.user.id
	)?.attributes;
	// validate and merge the imported macros
	const {
		result: validated,
		errors,
		count,
	} = await processEntries<string>(importedMacros, async (_name, content) => {
		if (typeof content !== "string") return { error: String(content), ok: false };
		try {
			const dice = replaceStatsInDiceFormula(
				getExpression(content, "0", attributes).dice,
				attributes
			);
			await baseRoll(dice.formula, interaction, client, false, true);
			return { ok: true, value: content };
		} catch {
			return { error: String(content), ok: false };
		}
	});

	for (const [name, value] of Object.entries(validated)) macros[name] = value as string;

	client.userSettings.set(guildId, macros, key);
	const text = errorMessage("snippets", ul, errors, count, validated);
	await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
}
