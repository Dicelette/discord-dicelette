import type { EClient } from "@dicelette/client";
import { escapeRegex, isNumber, roll, standardizeDice } from "@dicelette/core";
import { t } from "@dicelette/localization";
import { getExpression, replaceStatsInDiceFormula } from "@dicelette/parse_result";
import type { Snippets, Translation } from "@dicelette/types";
import { capitalizeBetweenPunct } from "@dicelette/utils";
import * as Djs from "discord.js";
import { evaluate } from "mathjs";

export async function chunkMessage(
	entries: [string, string | number][],
	ul: Translation,
	interaction: Djs.ChatInputCommandInteraction,
	appendText?: string
) {
	const lines = entries.map(
		([name, content]) =>
			`- **${name.toTitle()}**${ul("common.space")}: \`${content.toString().replaceAll("`", "\\`")}\``
	);
	if (appendText) lines.push(appendText);
	const lineLinked = lines.join("\n");
	if (lineLinked.length <= 2000) {
		//send as normal message
		await interaction.reply({
			content: lineLinked,
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	if (lineLinked.length <= 4000) {
		//send as component v2
		const textDisplay = new Djs.TextDisplayBuilder().setContent(lineLinked);
		await interaction.reply({
			components: [textDisplay],
			flags: [Djs.MessageFlags.Ephemeral, Djs.MessageFlags.IsComponentsV2],
		});
		return;
	}

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

export async function chunkErrorMessage(
	error: string,
	interaction: Djs.ChatInputCommandInteraction
) {
	const maxLength = 4000;
	const mindLength = 2000;
	if (error.length <= mindLength) {
		//send as normal message
		await interaction.reply({
			content: error,
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	if (error.length <= maxLength) {
		//send as component v2
		const textDisplay = new Djs.TextDisplayBuilder().setContent(error);
		await interaction.reply({
			components: [textDisplay],
			flags: [Djs.MessageFlags.Ephemeral, Djs.MessageFlags.IsComponentsV2],
		});
		return;
	}
	const errorLines = error.split("\n");
	//send the first message
	await interaction.reply({
		content: errorLines[0],
		flags: Djs.MessageFlags.Ephemeral,
	});
	const chunkedLines: string[][] = [];
	const chunkSize = 10;
	for (let i = 0; i < errorLines.length; i += chunkSize) {
		chunkedLines.push(errorLines.slice(i, i + chunkSize));
	}
	//send the rest as follow ups
	for (const chunk of chunkedLines.slice(1)) {
		const text = chunk.join("\n");
		await interaction.followUp({ content: text, flags: Djs.MessageFlags.Ephemeral });
	}
}

function formatSuccessImport(
	count: number,
	success: Record<string, unknown>,
	type: "attributes" | "snippets",
	ul: Translation
) {
	if (count === 1) {
		const name = Object.keys(success)[0];
		return ul(`userSettings.${type}.import.success`, {
			count,
			name: `**${name.toTitle()}** (\`${success[name]}\`)`,
		});
	}
	const res = `\n- ${Object.entries(success)
		.map(([name, value]) => `**${name.toTitle()}**${ul("common.space")}: \`${value}\``)
		.join("\n- ")}`;
	return ul(`userSettings.${type}.import.success`, { count }) + res;
}

export function errorMessage(
	type: "attributes" | "snippets",
	ul: Translation,
	errors: Record<string, unknown>,
	count: number,
	success: Record<string, unknown> = {}
) {
	let text = "";
	if (count > 0) text = `${formatSuccessImport(count, success, type, ul)}\n\n`;

	if (Object.keys(errors).length > 0) {
		let errorLines = Object.entries(errors)
			.map(
				([name, value]) => `- **${name.toTitle()}**${ul("common.space")}: \`${value}\``
			)
			.join("\n");
		errorLines = errorLines.length > 0 ? `\n${errorLines}` : "";
		text += `${ul(`userSettings.${type}.import.partialErrors`, { count: Object.keys(errors).length })}${errorLines}`;
	}
	return text;
}

export async function getContentFile(
	interaction: Djs.ChatInputCommandInteraction,
	t: Translation,
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

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function formatInvalidAttributeFormulaError(name?: string, value?: string) {
	if (!name && !value) return "invalidAttributeFormula";
	return `invalidAttributeFormula:${JSON.stringify({ name, value })}`;
}

function toNumber(value: unknown) {
	if (typeof value === "number") return value;
	if (isNumber(value)) return Number(value);
	return undefined;
}

/**
 * Single-pass builder: separates number attributes from formula attributes and
 * pre-populates the resolved map with numeric values.
 */
function buildAttributeMaps(attributes: Record<string, number | string>) {
	const numbersOnly: Record<string, number> = {};
	const formulaOnly: Record<string, string> = {};
	const resolved: Record<string, number> = {};
	const formulaNameMap: Record<string, string> = {};

	for (const [name, value] of Object.entries(attributes)) {
		const norm = name.standardize();
		if (typeof value === "number") {
			numbersOnly[name] = value;
			resolved[norm] = value;
		} else {
			const trimmed = value.trim();
			if (!trimmed) continue;
			formulaOnly[name] = trimmed;
			formulaNameMap[norm] = name;
		}
	}

	return { numbersOnly, formulaOnly, formulaNameMap, resolved };
}

/**
 * Resolves user attributes that may reference each other as formulas.
 *
 * Uses a single-pass map build followed by incremental substitution: when a
 * formula is resolved its value is immediately substituted into all remaining
 * pending formulas, so each stat replacement is performed exactly once rather
 * than rebuilding the full substitution map on every iteration.
 */
export function resolveUserAttributes(
	attributes?: Record<string, number | string>
): ValidationResult<Record<string, number> | undefined> {
	if (!attributes) return { ok: true, value: undefined };

	const { numbersOnly, formulaOnly, formulaNameMap, resolved } =
		buildAttributeMaps(attributes);

	if (Object.keys(formulaOnly).length === 0) return { ok: true, value: numbersOnly };

	// Pre-substitute already-resolved number stats into each formula expression.
	const pending: Record<string, string> = {};
	for (const [normName, origName] of Object.entries(formulaNameMap)) {
		let expr = standardizeDice(formulaOnly[origName]).standardize();
		for (const [statNorm, statValue] of Object.entries(resolved)) {
			expr = expr.replace(new RegExp(escapeRegex(statNorm), "gi"), statValue.toString());
		}
		pending[normName] = expr;
	}

	// Iterative resolution: try evaluate() on each pending expression.
	// When one resolves, propagate its value into the remaining expressions
	// immediately so each substitution is done exactly once.
	while (Object.keys(pending).length > 0) {
		let progress = false;
		for (const [normName, expr] of Object.entries(pending)) {
			try {
				const result = toNumber(evaluate(expr));
				if (result === undefined) continue;
				resolved[normName] = result;
				delete pending[normName];
				progress = true;
				// Propagate into remaining pending formulas right away.
				const re = new RegExp(escapeRegex(normName), "gi");
				for (const otherNorm of Object.keys(pending)) {
					pending[otherNorm] = pending[otherNorm].replace(re, result.toString());
				}
			} catch {
				// Expression still contains unresolved references — skip for now.
			}
		}

		if (!progress) {
			const [failingNorm, failingExpr] = Object.entries(pending)[0] ?? [];
			const origName = failingNorm
				? (formulaNameMap[failingNorm] ?? failingNorm)
				: undefined;
			const origFormula = origName ? formulaOnly[origName] : undefined;
			return {
				error: formatInvalidAttributeFormulaError(origName, origFormula ?? failingExpr),
				ok: false,
			};
		}
	}

	const computed: Record<string, number> = {};
	for (const [normName, origName] of Object.entries(formulaNameMap)) {
		const value = resolved[normName];
		if (!isNumber(value)) {
			return {
				error: formatInvalidAttributeFormulaError(origName, formulaOnly[origName]),
				ok: false,
			};
		}
		computed[origName] = Number(value);
	}

	return { ok: true, value: { ...numbersOnly, ...computed } };
}

export function validateAttributeEntry(
	name: string,
	value: unknown
): ValidationResult<number | string> {
	if (name.match(/-/)) return { error: "containsHyphen", ok: false };
	if (typeof value === "number") {
		if (Number.isNaN(value)) return { error: JSON.stringify(value), ok: false };
		return { ok: true, value };
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return { error: JSON.stringify(value), ok: false };
		return { ok: true, value: trimmed };
	}
	return { error: JSON.stringify(value), ok: false };
}

/**
 * Validates a snippet (dice formula) against resolved user attributes.
 * Automatically resolves formula-based attributes (e.g., "strength + 2") to numeric values.
 *
 * @param content - The dice formula string to validate
 * @param attributes - User attributes, can be plain numbers or formula strings
 * @param replaceUnknow - Optional fallback value for unknown attributes
 * @returns Validation result with the original content if valid
 */
export function validateSnippetEntry(
	content: unknown,
	attributes?: Record<string, number | string>,
	replaceUnknow?: string
): ValidationResult<string> {
	if (typeof content !== "string") return { error: String(content), ok: false };
	try {
		const resolvedAttributes = resolveUserAttributes(attributes);
		if (!resolvedAttributes.ok) return { error: content, ok: false };

		const substituted = replaceStatsInDiceFormula(
			getExpression(content, "0", resolvedAttributes.value).dice,
			resolvedAttributes.value,
			undefined,
			undefined,
			undefined,
			undefined,
			replaceUnknow
		);
		const formula = substituted.formula
			.replace(/\s*%%.*%%\s*/g, "")
			.replace(/\s*?#.*$/, "")
			.trim();
		const r = roll(formula);
		if (!r) return { error: content, ok: false };
		return { ok: true, value: content };
	} catch (e) {
		console.error(e, `Error validating snippet entry: ${content}`, content);
		return { error: content, ok: false };
	}
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
	ul: Translation
) {
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const name = interaction.options.getString(t("common.name"), true);
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
	if (store[name.standardize()]) {
		//already in it, we should delete it before to add the new one, to avoid keeping the old one if the user change only the case for example
		delete store[name.standardize()];
	}
	store[name] = value as unknown;
	const key = `${userId}.${type}`;
	client.userSettings.set(guildId, store, key);
	const args = formatArgs ? formatArgs(name, value) : { name: `**${name.toTitle()}**` };
	// biome-ignore lint/suspicious/noExplicitAny: template literal key is valid at runtime for "attributes" | "snippets" type
	const text = ul(`userSettings.${type}.create.success` as any, args) as any as string;
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
	const macros: Snippets | Record<string, number | string> = data?.[type] ?? {};
	let choices: string[] = [];
	if (focused.name === "name") {
		const input = options.getString("name")?.standardize() ?? "";
		choices = Object.keys(macros).filter((macroName) => macroName.subText(input));
	}
	return choices
		.slice(0, 25)
		.map((choice) => ({ name: capitalizeBetweenPunct(choice), value: choice }));
}
