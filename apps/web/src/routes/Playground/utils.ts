import { type CustomCritical, isNumber } from "@dicelette/core";
import { parseCustomCritical, rollCustomCritical } from "@dicelette/parse_result";
import { resolveFormulaHint } from "@shared";
import { Locale } from "discord-api-types/v10";
import type { CustomCriticalEntry } from "./types";

/** Maps the web UI locale to the Discord `Locale` the formatter expects. */
export function toDiscordLocale(locale: "en" | "fr"): Locale {
	return locale === "en" ? Locale.EnglishUS : Locale.French;
}

export function newCustomCritical(): CustomCriticalEntry {
	return {
		id: crypto.randomUUID(),
		name: "",
		sign: ">=",
		formula: "",
		onNaturalDice: false,
	};
}

/**
 * Builds the rolled custom-critical record the formatter expects from the UI
 * rows, reusing the bot's `parseCustomCritical` + `rollCustomCritical`.
 */
export function buildCustomCriticals(
	entries: CustomCriticalEntry[]
): Record<string, CustomCritical> {
	const record: Record<string, CustomCritical> = {};
	for (const cc of entries) {
		const name = cc.name.trim();
		const formula = cc.formula.trim();
		if (!name || !formula) continue;
		const prefixed = cc.onNaturalDice ? `(N)${name}` : name;
		const parsed = parseCustomCritical(prefixed, `${cc.sign}${formula}`);
		if (parsed) Object.assign(record, parsed);
	}
	return rollCustomCritical(record) ?? {};
}

export function parseNumber(value: string): number | undefined {
	return isNumber(value) ? Number(value) : undefined;
}

/**
 * Returns `record` with `name → value` added, or unchanged when the (trimmed)
 * name is empty or already present (case-insensitive). Shared by the stat add
 * row and the roll snapshot so both dedupe identically.
 */
export function withStat(
	record: Record<string, string>,
	name: string,
	value: string
): Record<string, string> {
	const trimmed = name.trim();
	if (
		!trimmed ||
		Object.keys(record).some((k) => k.toLowerCase() === trimmed.toLowerCase())
	)
		return record;
	return { ...record, [trimmed]: value.trim() };
}

/** Resolves a stat value (a number or, like an attribute, a formula) to a number. */
function resolveStatValue(raw: string, all: Record<string, string>): number | undefined {
	const direct = parseNumber(raw);
	if (direct !== undefined) return direct;
	const hint = resolveFormulaHint(raw.trim(), all);
	return hint.kind === "resolved" ? hint.value : undefined;
}

/**
 * Turns the attribute-style stat record into the `{ stats, statsName }` shape the
 * roll engine expects: `stats` is keyed by the normalized name (looked up when
 * resolving `$name` in a dice), `statsName` keeps the original casing for display.
 */
export function buildStats(entries: Record<string, string>): {
	stats: Record<string, number>;
	statsName: string[];
} {
	const stats: Record<string, number> = {};
	const statsName: string[] = [];
	for (const [rawName, rawValue] of Object.entries(entries)) {
		const name = rawName.trim();
		const value = resolveStatValue(rawValue, entries);
		if (!name || value === undefined) continue;
		stats[name.standardize()] = value;
		statsName.push(name);
	}
	return { stats, statsName };
}
