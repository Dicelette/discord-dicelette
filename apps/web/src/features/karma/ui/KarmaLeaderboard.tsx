import type { ApiKarmaEntry } from "@dicelette/api";
import {
	ALL_KARMA_OPTIONS,
	type KarmaOption,
	type KarmaSortMode,
	sortKarmaEntries,
} from "@dicelette/utils";
import { Share } from "@mui/icons-material";
import {
	Box,
	IconButton,
	MenuItem,
	Paper,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { buildKarmaLeaderboardShareHref } from "../shareLink";
import KarmaLeaderboardRow from "./KarmaLeaderboardRow";

const panelPaperSx = { p: 3, mb: 3 } as const;
const headerRowSx = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
} as const;
const controlsRowSx = {
	display: "flex",
	gap: 2,
	flexWrap: "wrap",
	alignItems: "center",
	mt: 1.5,
	mb: 1,
} as const;

function optionLabel(t: (key: string) => string, option: KarmaOption): string {
	switch (option) {
		case "total":
			return t("luckMeter.leaderboard.option.total");
		case "success":
			return t("roll.success");
		case "failure":
			return t("roll.failure");
		case "criticalSuccess":
			return t("roll.critical.success");
		case "criticalFailure":
			return t("roll.critical.failure");
	}
}

interface Props {
	guildId: string;
	users: ApiKarmaEntry[];
	initialOption?: KarmaOption;
	initialSortMode?: KarmaSortMode;
}

export default function KarmaLeaderboard({
	guildId,
	users,
	initialOption = "total",
	initialSortMode = "brut",
}: Props) {
	const { t } = useI18n();
	const [option, setOption] = useState<KarmaOption>(initialOption);
	const [sortMode, setSortMode] = useState<KarmaSortMode>(
		initialOption === "total" ? "brut" : initialSortMode
	);

	const ranked = useMemo(
		() => sortKarmaEntries(users, option, sortMode).slice(0, 10),
		[users, option, sortMode]
	);

	const handleOptionChange = (value: KarmaOption) => {
		setOption(value);
		if (value === "total") setSortMode("brut");
	};

	return (
		<Paper variant="outlined" sx={panelPaperSx}>
			<Box sx={headerRowSx}>
				<Typography variant="h6" sx={{ fontWeight: 600 }}>
					{t("karma.leaderboard.title")}
				</Typography>
				<Tooltip title={t("karma.leaderboard.share")}>
					<IconButton
						component={RouterLink}
						to={buildKarmaLeaderboardShareHref(guildId, option, sortMode)}
						target="_blank"
						rel="noopener noreferrer"
						size="small"
						aria-label={t("karma.leaderboard.share")}
					>
						<Share fontSize="small" />
					</IconButton>
				</Tooltip>
			</Box>
			<Box sx={controlsRowSx}>
				<TextField
					select
					size="small"
					label={t("karma.leaderboard.rankBy")}
					value={option}
					onChange={(e) => handleOptionChange(e.target.value as KarmaOption)}
					sx={{ minWidth: 170 }}
				>
					{ALL_KARMA_OPTIONS.map((opt) => (
						<MenuItem key={opt} value={opt}>
							{optionLabel(t, opt)}
						</MenuItem>
					))}
				</TextField>
				<ToggleButtonGroup
					size="small"
					exclusive
					value={sortMode}
					onChange={(_e, value: KarmaSortMode | null) => value && setSortMode(value)}
				>
					<ToggleButton value="brut">{t("luckMeter.leaderboard.sort.brut")}</ToggleButton>
					<ToggleButton value="ratio" disabled={option === "total"}>
						{t("luckMeter.leaderboard.sort.ratio")}
					</ToggleButton>
				</ToggleButtonGroup>
			</Box>
			{ranked.length === 0 ? (
				<Typography sx={{ color: "text.secondary" }}>
					{t("karma.leaderboard.empty")}
				</Typography>
			) : (
				<Box>
					{ranked.map((entry, i) => (
						<KarmaLeaderboardRow
							key={entry.userId}
							rank={i + 1}
							entry={entry}
							option={option}
							sortMode={sortMode}
							guildId={guildId}
						/>
					))}
				</Box>
			)}
		</Paper>
	);
}
