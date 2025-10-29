import {
	type Critical,
	type CustomCritical,
	isNumber,
	standardizeDice,
} from "@dicelette/core";

import { findln } from "@dicelette/localization";
import type * as Djs from "discord.js";
import { parseCustomCritical } from "./custom_critical";

export function parseEmbedToCritical(embed: Record<string, string>): {
	[name: string]: CustomCritical;
} {
	const customCritical: Record<string, CustomCritical> = {};
	//remove the 3 first field from the embed
	embed["roll.critical.success"] = "";
	embed["roll.critical.failure"] = "";
	embed["common.dice"] = "";
	for (const [name, value] of Object.entries(embed)) {
		if (value.length === 0) continue;
		const custom = parseCustomCritical(name, value);
		if (custom) {
			Object.assign(customCritical, custom);
		}
	}
	return customCritical;
}

export function parseEmbedToStats(
	embed?: Record<string, string>,
	integrateCombinaison = true
) {
	let stats: Record<string, number> | undefined;
	if (embed) {
		stats = {};
		for (const [name, damageValue] of Object.entries(embed)) {
			if (!isNumber(damageValue)) {
				//it's a combinaison
				//remove the `x` = text;
				const combinaison = damageValue.split("=")[1].trim();
				if (integrateCombinaison)
					stats[name.unidecode()] = Number.parseInt(combinaison, 10);
			} else stats[name.unidecode()] = Number.parseInt(damageValue, 10);
		}
	}
	return stats;
}

export function parseTemplateField(embed: Record<string, string>): {
	diceType?: string;
	critical?: Critical;
	customCritical?: {
		[name: string]: CustomCritical;
	};
} {
	const success = embed?.["roll.critical.success"];
	const failure = embed?.["roll.critical.failure"];
	return {
		critical: {
			failure: isNumber(failure) ? Number.parseInt(failure, 10) : undefined,
			success: isNumber(success) ? Number.parseInt(success, 10) : undefined,
		},
		customCritical: parseEmbedToCritical(embed),
		diceType: embed?.["common.dice"] || undefined,
	};
}

/**
 * Parse the embed fields and remove the backtick if any
 */
export function parseEmbedFields(embed: Djs.Embed): Record<string, string> {
	const fields = embed?.fields;
	if (!fields) return {};
	const parsedFields: Record<string, string> = {};
	for (const field of fields) {
		parsedFields[findln(field.name.removeBacktick().unidecode(true))] = findln(
			field.value.removeBacktick()
		);
	}
	return parsedFields;
}

export function parseDamageFields(embed: Djs.Embed): Record<string, string> {
	const fields = embed?.fields;
	if (!fields) return {};
	const parsedFields: Record<string, string> = {};
	for (const field of fields) {
		const { name, value } = field;
		const standardizedValue = standardizeDice(value);
		parsedFields[name.standardize()] = standardizedValue.removeBacktick();
	}
	return parsedFields;
}
