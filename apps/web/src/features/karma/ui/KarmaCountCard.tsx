import type { Count } from "@dicelette/types";
import { Share } from "@mui/icons-material";
import PersonIcon from "@mui/icons-material/Person";
import { Avatar, Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import { useI18n } from "@shared";
import { Link as RouterLink } from "react-router-dom";
import KarmaStatTile, { type KarmaTone } from "./KarmaStatTile";
import KarmaStreakChip from "./KarmaStreakChip";

const cardPaperSx = { p: 3 } as const;
const headerBoxSx = { display: "flex", alignItems: "center", gap: 2, mb: 2 } as const;
const nameSectionSx = { flex: 1, minWidth: 0 } as const;
const streaksBoxSx = { display: "flex", gap: 1, flexWrap: "wrap", mb: 2 } as const;
const statsGridSx = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
	gap: 1.5,
} as const;
const shareButtonSx = { flexShrink: 0 } as const;

function pct(partial: number, total: number): string {
	return total === 0 ? "0.00" : ((partial / total) * 100).toFixed(2);
}

interface Props {
	displayName: string | null;
	avatar?: string | null;
	count: Count;
	/** When set, shows a share icon (top-right, level with the name) linking here. */
	shareHref?: string;
}

export default function KarmaCountCard({ displayName, avatar, count, shareHref }: Props) {
	const { t } = useI18n();
	const total = count.total ?? count.success + count.failure;
	const name = displayName ?? t("karma.unnamed");

	const tiles: { tone: KarmaTone; label: string; value: number; caption: string }[] = [
		{
			tone: "success",
			label: t("roll.success"),
			value: count.success,
			caption: `${pct(count.success, total)}%`,
		},
		{
			tone: "failure",
			label: t("roll.failure"),
			value: count.failure,
			caption: `${pct(count.failure, total)}%`,
		},
	];
	if (count.criticalSuccess > 0) {
		tiles.push({
			tone: "criticalSuccess",
			label: t("roll.critical.success"),
			value: count.criticalSuccess,
			caption: `${pct(count.criticalSuccess, total)}%`,
		});
	}
	if (count.criticalFailure > 0) {
		tiles.push({
			tone: "criticalFailure",
			label: t("roll.critical.failure"),
			value: count.criticalFailure,
			caption: `${pct(count.criticalFailure, total)}%`,
		});
	}

	const hasStreakInfo =
		(count.consecutive?.success ?? 0) > 1 ||
		(count.consecutive?.failure ?? 0) > 1 ||
		(count.longestStreak?.success ?? 0) > 1 ||
		(count.longestStreak?.failure ?? 0) > 1;

	return (
		<Paper variant="outlined" sx={cardPaperSx}>
			<Box sx={headerBoxSx}>
				<Avatar src={avatar ?? undefined} alt={name} sx={{ width: 40, height: 40 }}>
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
			{hasStreakInfo && (
				<Box sx={streaksBoxSx}>
					<KarmaStreakChip
						type="success"
						current={count.consecutive?.success}
						longest={count.longestStreak?.success}
					/>
					<KarmaStreakChip
						type="failure"
						current={count.consecutive?.failure}
						longest={count.longestStreak?.failure}
					/>
				</Box>
			)}
			<Box sx={statsGridSx}>
				{tiles.map((tile) => (
					<KarmaStatTile key={tile.label} {...tile} />
				))}
			</Box>
		</Paper>
	);
}
