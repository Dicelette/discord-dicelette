import type { Translation } from "@dicelette/types";
import { averageValue, gaugeEmoji, percentage, serverStats } from "@dicelette/utils";
import type { Options } from "./types";

export { averageValue, gaugeEmoji, percentage, serverStats };

/** Localized title for a karma option (success/failure/critical/total). */
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
