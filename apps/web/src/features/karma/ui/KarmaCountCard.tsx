import type { Count } from "@dicelette/types";
import { Share } from "@mui/icons-material";
import PersonIcon from "@mui/icons-material/Person";
import {
	Avatar,
	Box,
	IconButton,
	Paper,
	type SxProps,
	type Theme,
	Tooltip,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import KarmaStatTile, { type KarmaTone } from "./KarmaStatTile";
import KarmaStreakChip from "./KarmaStreakChip";
import { statsGridSx, tilePositionSx } from "./karmaStatGrid";

const cardPaperSx = { p: 3 } as const;
const headerBoxSx = { display: "flex", alignItems: "center", gap: 2, mb: 2 } as const;
const nameSectionSx = { flex: 1, minWidth: 0 } as const;
const shareButtonSx = { flexShrink: 0 } as const;

function pct(partial: number, total: number): string {
	return total === 0 ? "0.00" : ((partial / total) * 100).toFixed(2);
}

interface Props {
	displayName: string | null;
	username?: string | null;
	avatar?: string | null;
	count: Count;
	/** When set, shows a share icon (top-right, level with the name) linking here. */
	shareHref?: string;
}

export default function KarmaCountCard({
	displayName,
	username,
	avatar,
	count,
	shareHref,
}: Props) {
	const { t } = useI18n();
	const total = count.total ?? count.success + count.failure;
	const name = displayName ?? t("karma.unnamed");

	const hasSuccessStreakInfo =
		(count.consecutive?.success ?? 0) > 1 || (count.longestStreak?.success ?? 0) > 1;
	const hasFailureStreakInfo =
		(count.consecutive?.failure ?? 0) > 1 || (count.longestStreak?.failure ?? 0) > 1;

	const tiles: {
		tone: KarmaTone;
		label: string;
		value: number;
		caption: string;
		extra?: ReactNode;
		sx: SxProps<Theme>;
	}[] = [
		{
			tone: "success",
			label: t("roll.success"),
			value: count.success,
			caption: `${pct(count.success, total)}%`,
			extra: hasSuccessStreakInfo ? (
				<KarmaStreakChip
					type="success"
					current={count.consecutive?.success}
					longest={count.longestStreak?.success}
				/>
			) : undefined,
			sx: tilePositionSx("success"),
		},
		{
			tone: "failure",
			label: t("roll.failure"),
			value: count.failure,
			caption: `${pct(count.failure, total)}%`,
			extra: hasFailureStreakInfo ? (
				<KarmaStreakChip
					type="failure"
					current={count.consecutive?.failure}
					longest={count.longestStreak?.failure}
				/>
			) : undefined,
			sx: tilePositionSx("failure"),
		},
	];
	if (count.criticalSuccess > 0) {
		tiles.push({
			tone: "criticalSuccess",
			label: t("roll.critical.success"),
			value: count.criticalSuccess,
			caption: `${pct(count.criticalSuccess, total)}%`,
			sx: tilePositionSx("criticalSuccess"),
		});
	}
	if (count.criticalFailure > 0) {
		tiles.push({
			tone: "criticalFailure",
			label: t("roll.critical.failure"),
			value: count.criticalFailure,
			caption: `${pct(count.criticalFailure, total)}%`,
			sx: tilePositionSx("criticalFailure"),
		});
	}

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
					{username && (
						<Typography
							variant="caption"
							noWrap
							sx={{ color: "text.secondary", display: "block" }}
						>
							{username}
						</Typography>
					)}
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
				{tiles.map((tile) => (
					<KarmaStatTile key={tile.tone} {...tile} />
				))}
			</Box>
		</Paper>
	);
}
