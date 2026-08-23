import { Chip, Tooltip } from "@mui/material";
import { useI18n } from "@shared";
import { recordIcon, streakIcon } from "./streakIcon";

interface Props {
	type: "success" | "failure";
	/** Current consecutive count — chip is omitted entirely when ≤ 1 (no active streak). */
	current?: number;
	/** Longest streak ever recorded — shown as a muted chip when there's no active streak. */
	longest?: number;
}

/** Mirrors the bot's own /karma bilan streak display — same gauge tiers, same wording. */
export default function KarmaStreakChip({ type, current, longest }: Props) {
	const { t } = useI18n();

	if (current && current > 1) {
		const StreakIcon = streakIcon(type, current);
		return (
			<Tooltip title={t(`luckMeter.count.consecutive.${type}`)}>
				<Chip
					size="small"
					icon={StreakIcon ? <StreakIcon fontSize="small" /> : undefined}
					label={t("karma.streakActive", { count: current })}
					color={type === "success" ? "warning" : "error"}
					variant="filled"
				/>
			</Tooltip>
		);
	}

	if (longest && longest > 1) {
		const RecordIcon = recordIcon(type);
		return (
			<Tooltip title={t(`luckMeter.count.longest.${type}`)}>
				<Chip
					size="small"
					icon={<RecordIcon fontSize="small" />}
					label={t("karma.streakRecord", { count: longest })}
					variant="outlined"
				/>
			</Tooltip>
		);
	}

	return null;
}
