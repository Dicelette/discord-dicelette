import type { Count, Translation } from "@dicelette/types";
import type { Options } from "./types";

export function percentage(partial: number, total: number) {
	return total === 0 ? "0.00" : ((partial / total) * 100).toFixed(2);
}

export function averageValue(total: number, count: number) {
	return count === 0 ? "0.00" : (total / count).toFixed(2);
}

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

/**
 * Selects an emoji representing a consecutive success or failure streak.
 *
 * @param type - "success" to choose from success emojis, "failure" to choose from failure emojis
 * @param value - The consecutive-streak length
 * @returns An emoji chosen by `type` and `value`: empty string for `value` ≤ 1; for `value` > 1 and ≤ 5 the first emoji (`"😎"` or `"😔"`); for `value` > 5 and ≤ 10 the second emoji (`"🔥"` or `"💔"`); for `value` > 10 the third emoji (`"🐐"` or `"💀"`)
 */
export function gaugeEmoji(type: "success" | "failure", value: number) {
	if (value <= 1) return "";
	const successEmoji = ["😎", "🔥", "🐐"];
	const failureEmoji = ["😔", "💔", "💀"];
	const emoji = type === "success" ? successEmoji : failureEmoji;
	if (value > 1 && value <= 5) return emoji[0];
	if (value > 5 && value <= 10) return emoji[1];
	if (value > 10) return emoji[2];
	return "";
}

export function serverStats(
	totalCount: Count,
	rollTotal: number,
	usersWithCounts: number
) {
	const percent = {
		criticalFailure: percentage(totalCount.criticalFailure, rollTotal),
		criticalSuccess: percentage(totalCount.criticalSuccess, rollTotal),
		failure: percentage(totalCount.failure, rollTotal),
		success: percentage(totalCount.success, rollTotal),
	};

	const avg = {
		criticalFailure: averageValue(totalCount.criticalFailure, usersWithCounts),
		criticalSuccess: averageValue(totalCount.criticalSuccess, usersWithCounts),
		failure: averageValue(totalCount.failure, usersWithCounts),
		success: averageValue(totalCount.success, usersWithCounts),
	};
	return { avg, percent };
}
