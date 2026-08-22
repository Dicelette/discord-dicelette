import type { Count } from "@dicelette/types";
import { Share } from "@mui/icons-material";
import PersonIcon from "@mui/icons-material/Person";
import { Avatar, Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import { useI18n } from "@shared";
import { Link as RouterLink } from "react-router-dom";
import StatCell from "../../characters/ui/StatCell";

const cardPaperSx = { p: 3 } as const;
const headerBoxSx = { display: "flex", alignItems: "center", gap: 2, mb: 2 } as const;
const nameSectionSx = { flex: 1, minWidth: 0 } as const;
const statsGridSx = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
	gap: 1,
} as const;
const shareButtonSx = { flexShrink: 0 } as const;

function pct(partial: number, total: number): string {
	return total === 0 ? "0.00" : ((partial / total) * 100).toFixed(2);
}

interface Props {
	displayName: string | null;
	count: Count;
	/** When set, shows a share icon (top-right, level with the name) linking here. */
	shareHref?: string;
}

export default function KarmaCountCard({ displayName, count, shareHref }: Props) {
	const { t } = useI18n();
	const total = count.total ?? count.success + count.failure;
	const name = displayName ?? t("karma.unnamed");

	const cells: { name: string; value: string }[] = [
		{
			name: t("roll.success"),
			value: `${count.success} (${pct(count.success, total)}%)`,
		},
		{
			name: t("roll.failure"),
			value: `${count.failure} (${pct(count.failure, total)}%)`,
		},
	];
	if (count.criticalSuccess > 0) {
		cells.push({
			name: t("roll.critical.success"),
			value: `${count.criticalSuccess} (${pct(count.criticalSuccess, total)}%)`,
		});
	}
	if (count.criticalFailure > 0) {
		cells.push({
			name: t("roll.critical.failure"),
			value: `${count.criticalFailure} (${pct(count.criticalFailure, total)}%)`,
		});
	}
	if (count.consecutive?.success && count.consecutive.success > 1) {
		cells.push({
			name: t("luckMeter.count.consecutive.success"),
			value: String(count.consecutive.success),
		});
	}
	if (count.consecutive?.failure && count.consecutive.failure > 1) {
		cells.push({
			name: t("luckMeter.count.consecutive.failure"),
			value: String(count.consecutive.failure),
		});
	}
	if (count.longestStreak?.success && count.longestStreak.success > 1) {
		cells.push({
			name: t("luckMeter.count.longest.success"),
			value: String(count.longestStreak.success),
		});
	}
	if (count.longestStreak?.failure && count.longestStreak.failure > 1) {
		cells.push({
			name: t("luckMeter.count.longest.failure"),
			value: String(count.longestStreak.failure),
		});
	}

	return (
		<Paper variant="outlined" sx={cardPaperSx}>
			<Box sx={headerBoxSx}>
				<Avatar sx={{ width: 40, height: 40 }}>
					<PersonIcon />
				</Avatar>
				<Box sx={nameSectionSx}>
					<Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
						{name}
					</Typography>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{t(total === 1 ? "karma.rollCountOne" : "karma.rollCountOther", { total })}
					</Typography>
				</Box>
				{shareHref && (
					<Tooltip title={t("karma.share")}>
						<IconButton
							component={RouterLink}
							to={shareHref}
							size="small"
							aria-label={t("karma.share")}
							sx={shareButtonSx}
						>
							<Share fontSize="small" />
						</IconButton>
					</Tooltip>
				)}
			</Box>
			<Box sx={statsGridSx}>
				{cells.map((cell) => (
					<StatCell key={cell.name} name={cell.name} value={cell.value} />
				))}
			</Box>
		</Paper>
	);
}
