import type { ApiKarmaOverview } from "@dicelette/api";
import { Box, Paper, type SxProps, type Theme, Typography } from "@mui/material";
import { useI18n } from "@shared";
import KarmaStatTile, { type KarmaTone } from "./KarmaStatTile";
import { statsGridSx as baseStatsGridSx, tilePositionSx } from "./karmaStatGrid";

const cardPaperSx = { p: 3 } as const;
const statsGridSx = { ...baseStatsGridSx, mt: 1.5 } as const;

interface Props {
	server: ApiKarmaOverview["server"];
}

export default function KarmaServerStats({ server }: Props) {
	const { t } = useI18n();
	const { totalCount, avg, percent, rollTotal, usersWithCounts } = server;

	const tiles: {
		tone: KarmaTone;
		label: string;
		value: number;
		caption: string;
		sx: SxProps<Theme>;
	}[] = [
		{
			tone: "failure",
			label: t("roll.failure"),
			value: totalCount.failure,
			caption: `${t("karma.average")}: ${avg.failure} (${percent.failure}%)`,
			sx: tilePositionSx("failure"),
		},
		{
			tone: "success",
			label: t("roll.success"),
			value: totalCount.success,
			caption: `${t("karma.average")}: ${avg.success} (${percent.success}%)`,
			sx: tilePositionSx("success"),
		},
	];
	if (totalCount.criticalFailure > 0) {
		tiles.push({
			tone: "criticalFailure",
			label: t("roll.critical.failure"),
			value: totalCount.criticalFailure,
			caption: `${t("karma.average")}: ${avg.criticalFailure} (${percent.criticalFailure}%)`,
			sx: tilePositionSx("criticalFailure"),
		});
	}
	if (totalCount.criticalSuccess > 0) {
		tiles.push({
			tone: "criticalSuccess",
			label: t("roll.critical.success"),
			value: totalCount.criticalSuccess,
			caption: `${t("karma.average")}: ${avg.criticalSuccess} (${percent.criticalSuccess}%)`,
			sx: tilePositionSx("criticalSuccess"),
		});
	}

	return (
		<Paper variant="outlined" sx={cardPaperSx}>
			<Typography variant="h6" sx={{ fontWeight: 600 }}>
				{t("karma.serverStats")}
			</Typography>
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				{t("karma.totalRolls", { rollTotal, usersWithCounts })}
			</Typography>
			<Box sx={statsGridSx}>
				{tiles.map((tile) => (
					<KarmaStatTile key={tile.tone} {...tile} />
				))}
			</Box>
		</Paper>
	);
}
