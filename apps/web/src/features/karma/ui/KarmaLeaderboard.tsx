import type { ApiKarmaEntry } from "@dicelette/api";
import {
	ALL_KARMA_OPTIONS,
	type KarmaOption,
	type KarmaSortMode,
	sortKarmaEntries,
} from "@dicelette/utils";
import {
	Box,
	MenuItem,
	Paper,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { useMemo, useState } from "react";
import KarmaLeaderboardRow from "./KarmaLeaderboardRow";

const panelPaperSx = { p: 3, mb: 3 } as const;
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
}

export default function KarmaLeaderboard({ guildId, users }: Props) {
	const { t } = useI18n();
	const [option, setOption] = useState<KarmaOption>("total");
	const [sortMode, setSortMode] = useState<KarmaSortMode>("brut");

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
			<Typography variant="h6" sx={{ fontWeight: 600 }}>
				{t("karma.leaderboard.title")}
			</Typography>
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
