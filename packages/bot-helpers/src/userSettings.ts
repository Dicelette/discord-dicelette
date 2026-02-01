import type { EClient } from "@dicelette/client";
import type { Snippets, Translation } from "@dicelette/types";
import * as Djs from "discord.js";

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

export function errorMessage(
	type: "attributes" | "snippets",
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

export async function getContentFile(
	interaction: Djs.ChatInputCommandInteraction,
	t: (key: string) => string,
	ul: Translation
) {
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
		await interaction.reply({ content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	const response = await fetch(file.url);
	const fileContent = await response.text();
	return { fileContent, guildId, overwrite, ul, userId };
}

export async function processEntries<T>(
	entries: Record<string, unknown>,
	validate: (
		name: string,
		value: unknown
	) => Promise<{ ok: true; value: T } | { ok: false; error: unknown }>
) {
	const result: Record<string, T> = {};
	const errors: Record<string, string> = {};
	let count = 0;
	for (const [name, value] of Object.entries(entries)) {
		const r = await validate(name, value);
		if (r.ok) {
			result[name] = r.value;
			count += 1;
		} else {
			const err = r.error;
			errors[name] = typeof err === "string" ? err : JSON.stringify(err);
		}
	}
	return { count, errors, result };
}

export function buildJsonAttachment(content: unknown, name: string) {
	const fileContent = JSON.stringify(content, null, 2);
	const buffer = Buffer.from(fileContent, "utf-8");
	return new Djs.AttachmentBuilder(buffer, { name });
}

export async function displayEntries(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	type: "attributes" | "snippets",
	ul: Translation
) {
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const entries = Object.entries(client.userSettings.get(guildId, userId)?.[type] ?? {});
	if (entries.length === 0) {
		const text = ul(`userSettings.${type}.list.empty`);
		await interaction.reply({ content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	await chunkMessage(entries as [string, string | number][], ul, interaction);
}

export async function removeEntry(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	type: "attributes" | "snippets",
	optionName: string,
	ul: Translation
) {
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const name = interaction.options.getString(optionName, true);
	const store = client.userSettings.get(guildId, userId)?.[type] ?? {};
	if (!(name in store)) {
		const text = ul(`userSettings.${type}.delete.notFound`, {
			name: `**${name.toTitle()}**`,
		});
		await interaction.reply({ content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	delete store[name];
	const key = `${userId}.${type}`;
	client.userSettings.set(guildId, store, key);
	const text = ul(`userSettings.${type}.delete.success`, {
		name: `**${name.toTitle()}**`,
	});
	await interaction.reply({ content: text, flags: Djs.MessageFlags.Ephemeral });
}

export async function exportEntries(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	type: "attributes" | "snippets",
	ul: Translation
) {
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const store = client.userSettings.get(guildId, userId)?.[type] ?? {};
	if (Object.keys(store).length === 0) {
		const text = ul(`userSettings.${type}.export.empty`);
		await interaction.reply({ content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	const name = `${type}-${userId}.json`;
	const attachment = buildJsonAttachment(store, name);
	const text = ul(`userSettings.${type}.export.success`);
	await interaction.reply({
		content: text,
		files: [attachment],
		flags: Djs.MessageFlags.Ephemeral,
	});
}

export async function registerEntry<T>(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	type: "attributes" | "snippets",
	name: string,
	value: T,
	ul: Translation,
	formatArgs?: (name: string, value: T) => Record<string, string>
) {
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const store: Record<string, unknown> =
		client.userSettings.get(guildId, userId)?.[type] ?? {};
	store[name] = value as unknown;
	const key = `${userId}.${type}`;
	client.userSettings.set(guildId, store, key);
	const args = formatArgs ? formatArgs(name, value) : { name: `**${name.toTitle()}**` };
	const text = ul(`userSettings.${type}.create.success`, args);
	await interaction.reply({ content: text, flags: Djs.MessageFlags.Ephemeral });
}

export async function importEntries(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	type: "attributes" | "snippets",
	validate: (
		name: string,
		value: unknown
	) => Promise<{ ok: true; value: unknown } | { ok: false; error: unknown }>,
	t: (key: string) => string,
	ul: Translation
) {
	const data = await getContentFile(interaction, t, ul);
	if (!data) return;
	const { fileContent, guildId, overwrite, userId } = data;
	let imported: Record<string, unknown>;
	try {
		imported = JSON.parse(fileContent);
	} catch {
		const text = ul("userSettings.snippets.import.invalidContent", {
			ex: JSON.stringify({ example: "example" }, null, 2),
		});
		await interaction.reply({ content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	if (typeof imported !== "object" || Array.isArray(imported)) {
		const text = ul("userSettings.snippets.import.invalidContent", {
			ex: JSON.stringify({ example: "example" }, null, 2),
		});
		await interaction.reply({ content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	const key = `${userId}.${type}`;
	let current: Record<string, unknown> =
		client.userSettings.get(guildId, userId)?.[type] ?? {};
	if (overwrite) current = {};
	const { result: validated, errors, count } = await processEntries(imported, validate);
	for (const [name, value] of Object.entries(validated)) {
		current[name] = value as unknown;
	}
	client.userSettings.set(guildId, current, key);
	const text = errorMessage(type, ul, errors, count);
	await interaction.reply({ content: text, flags: Djs.MessageFlags.Ephemeral });
}

export function getSettingsAutoComplete(
	interaction: Djs.AutocompleteInteraction,
	client: EClient,
	type: "snippets" | "attributes" = "snippets"
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const focused = options.getFocused(true);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const data = client.userSettings.get(guildId, userId);
	const macros: Snippets | Record<string, number> = data?.[type] ?? {};
	let choices: string[] = [];
	if (focused.name === "name") {
		const input = options.getString("name")?.standardize() ?? "";
		choices = Object.keys(macros).filter((macroName) => macroName.subText(input));
	}
	return choices;
}
