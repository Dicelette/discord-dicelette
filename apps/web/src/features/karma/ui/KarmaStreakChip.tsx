import { AcUnit, LocalFireDepartment } from "@mui/icons-material";
import { Chip, Tooltip } from "@mui/material";
import { useI18n } from "@shared";

interface Props {
	type: "success" | "failure";
	/** Current consecutive count — chip is omitted entirely when ≤ 1 (no active streak). */
	current?: number;
	/** Longest streak ever recorded — shown as a muted chip when there's no active streak. */
	longest?: number;
}

export default function KarmaStreakChip({ type, current, longest }: Props) {
	const { t } = useI18n();
	const icon =
		type === "success" ? (
			<LocalFireDepartment fontSize="small" />
		) : (
			<AcUnit fontSize="small" />
		);

	if (current && current > 1) {
		return (
			<Tooltip title={t(`luckMeter.count.consecutive.${type}`)}>
				<Chip
					size="small"
					icon={icon}
					label={t("karma.streakActive", { count: current })}
					color={type === "success" ? "warning" : "error"}
					variant="filled"
				/>
			</Tooltip>
		);
	}

	if (longest && longest > 1) {
		return (
			<Tooltip title={t(`luckMeter.count.longest.${type}`)}>
				<Chip
					size="small"
					icon={icon}
					label={t("karma.streakRecord", { count: longest })}
					variant="outlined"
				/>
			</Tooltip>
		);
	}

	return null;
}
