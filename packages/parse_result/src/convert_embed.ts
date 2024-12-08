import type { Critical, CustomCritical } from "@dicelette/core";
import { parseCustomCritical } from "./result_as_text";

export function parseEmbedToCritical(embed: Record<string, string>): {
	[name: string]: CustomCritical;
} {
	const customCritical: { [name: string]: CustomCritical } = {};
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
	let stats: Record<string, number> | undefined = undefined;
	if (embed) {
		stats = {};
		for (const [name, damageValue] of Object.entries(embed)) {
			const value = Number.parseInt(damageValue.removeBacktick(), 10);
			if (Number.isNaN(value)) {
				//it's a combinaison
				//remove the `x` = text;
				const combinaison = damageValue.split("=")[1].trim();
				if (integrateCombinaison)
					stats[name.unidecode()] = Number.parseInt(combinaison, 10);
			} else stats[name.unidecode()] = value;
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
	return {
		diceType: embed?.["common.dice"] || undefined,
		critical: {
			success: Number.parseInt(embed?.["roll.critical.success"], 10),
			failure: Number.parseInt(embed?.["roll.critical.failure"], 10),
		},
		customCritical: parseEmbedToCritical(embed),
	};
}
