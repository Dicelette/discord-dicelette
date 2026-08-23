import { streakTier } from "@dicelette/utils";

const SUCCESS_STREAK_ICON = [
	"tabler:sunglasses-filled",
	"tabler:flame-filled",
	"tabler:crown-filled",
];
const FAILURE_STREAK_ICON = [
	"tabler:mood-sad-filled",
	"tabler:heart-broken-filled",
	"tabler:skull",
];

/**
 * Iconify icon name for a consecutive-streak chip, mirroring the bot's own
 * gaugeEmoji tiers (😎/🔥/🐐 and 😔/💔/💀) with an equivalent icon set.
 * Returns null when there's no active streak (value ≤ 1).
 */
export function streakIcon(type: "success" | "failure", value: number): string | null {
	const tier = streakTier(value);
	if (tier === 0) return null;
	const icons = type === "success" ? SUCCESS_STREAK_ICON : FAILURE_STREAK_ICON;
	return icons[tier - 1];
}

/** Icon for a "longest streak ever" chip — a trophy for a success record, a grave for a failure one. */
export function recordIcon(type: "success" | "failure"): string {
	return type === "success" ? "tabler:trophy" : "tabler:grave";
}
