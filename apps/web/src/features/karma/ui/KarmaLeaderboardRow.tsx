import type { ApiKarmaEntry } from "@dicelette/api";
import type { KarmaOption, KarmaSortMode } from "@dicelette/utils";
import { Share } from "@mui/icons-material";
import PersonIcon from "@mui/icons-material/Person";
import { Avatar, Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useI18n } from "@shared";
import { Link as RouterLink } from "react-router-dom";
import { buildKarmaShareHref } from "../shareLink";

const rowSx = {
	display: "flex",
	alignItems: "center",
	gap: 1.5,
	py: 1,
	px: 1.5,
	borderRadius: 1.5,
	"&:not(:last-of-type)": { borderBottom: "1px solid", borderColor: "divider" },
} as const;
const rankSx = {
	width: 28,
	flexShrink: 0,
	textAlign: "center",
	fontWeight: 700,
	fontVariantNumeric: "tabular-nums",
} as const;
const rankColors: Record<number, string> = {
	1: "#d4af37",
	2: "#9aa0a6",
	3: "#a56a3a",
};
const nameSectionSx = { flex: 1, minWidth: 0 } as const;

function pct(partial: number, total: number): string {
	return total === 0 ? "0.00" : ((partial / total) * 100).toFixed(2);
}

interface Props {
	rank: number;
	entry: ApiKarmaEntry;
	option: KarmaOption;
	sortMode: KarmaSortMode;
	guildId: string;
}

export default function KarmaLeaderboardRow({
	rank,
	entry,
	option,
	sortMode,
	guildId,
}: Props) {
	const { t } = useI18n();
	const name = entry.displayName ?? t("karma.unnamed");
	const value = entry[option] ?? 0;
	const total = entry.total ?? 0;

	const isRatioMode = sortMode === "ratio" && option !== "total";
	const primary = isRatioMode ? `${pct(value, total)}%` : value;
	const secondary =
		option === "total"
			? null
			: isRatioMode
				? `${value}/${total}`
				: `${pct(value, total)}%`;

	return (
		<Box sx={rowSx}>
			<Typography sx={{ ...rankSx, color: rankColors[rank] }}>#{rank}</Typography>
			<Avatar
				src={entry.avatar ?? undefined}
				alt={name}
				sx={{ width: 32, height: 32, flexShrink: 0 }}
			>
				<PersonIcon fontSize="small" />
			</Avatar>
			<Box sx={nameSectionSx}>
				<Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
					{name}
				</Typography>
				{entry.username && (
					<Typography
						variant="caption"
						noWrap
						sx={{ color: "text.secondary", display: "block" }}
					>
						{entry.username}
					</Typography>
				)}
			</Box>
			<Box sx={{ textAlign: "right", flexShrink: 0 }}>
				<Typography variant="body1" sx={{ fontWeight: 700 }}>
					{primary}
				</Typography>
				{secondary && (
					<Typography
						variant="caption"
						sx={{ color: "text.secondary", display: "block" }}
					>
						{secondary}
					</Typography>
				)}
			</Box>
			<Tooltip title={t("karma.share")}>
				<IconButton
					component={RouterLink}
					to={buildKarmaShareHref(guildId, entry.userId)}
					size="small"
					aria-label={t("karma.share")}
				>
					<Share fontSize="small" />
				</IconButton>
			</Tooltip>
		</Box>
	);
}
