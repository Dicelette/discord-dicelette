import type { Translation } from "@dicelette/types";
import { averageValue, gaugeEmoji, percentage, serverStats } from "@dicelette/utils";
import type { Options } from "./types";

export { averageValue, gaugeEmoji, percentage, serverStats };

/**
 * Return the localized title corresponding to the given option.
 *
 * @param option - The option key to localize
 * @param ul - Translation helper that maps localization keys to strings
 * @returns The localized title for `option`
 */
export function getTitle(option: Options, ul: Translation) {
	const titles: Record<Options, string> = {
		criticalFailure: ul("roll.critical.failure"),
		criticalSuccess: ul("roll.critical.success"),
		failure: ul("roll.failure"),
		success: ul("roll.success"),
		total: ul("common.total"),
	};
	return titles[option];
}
