import { streakTier } from "@dicelette/utils";
import Dangerous from "@mui/icons-material/Dangerous";
import EmojiEvents from "@mui/icons-material/EmojiEvents";
import HeartBroken from "@mui/icons-material/HeartBroken";
import LocalFireDepartment from "@mui/icons-material/LocalFireDepartment";
import Mood from "@mui/icons-material/Mood";
import SentimentDissatisfied from "@mui/icons-material/SentimentDissatisfied";
import ThumbDownAlt from "@mui/icons-material/ThumbDownAlt";
import WorkspacePremium from "@mui/icons-material/WorkspacePremium";
import type { SvgIconProps } from "@mui/material";
import type { ComponentType } from "react";

type IconComponent = ComponentType<SvgIconProps>;

const SUCCESS_STREAK_ICON: IconComponent[] = [
	Mood,
	LocalFireDepartment,
	WorkspacePremium,
];
const FAILURE_STREAK_ICON: IconComponent[] = [
	SentimentDissatisfied,
	HeartBroken,
	Dangerous,
];

/**
 * Icon component for a consecutive-streak chip, mirroring the bot's own
 * gaugeEmoji tiers (😎/🔥/🐐 and 😔/💔/💀) with an equivalent icon set.
 * Bundled MUI icons (not a runtime-fetched icon set) so the streak chip
 * never depends on reaching a third-party CDN. Returns null when there's
 * no active streak (value ≤ 1).
 */
export function streakIcon(
	type: "success" | "failure",
	value: number
): IconComponent | null {
	const tier = streakTier(value);
	if (tier === 0) return null;
	const icons = type === "success" ? SUCCESS_STREAK_ICON : FAILURE_STREAK_ICON;
	return icons[tier - 1];
}

/** Icon for a "longest streak ever" chip — a trophy for a success record, a thumbs-down for a failure one. */
export function recordIcon(type: "success" | "failure"): IconComponent {
	return type === "success" ? EmojiEvents : ThumbDownAlt;
}
