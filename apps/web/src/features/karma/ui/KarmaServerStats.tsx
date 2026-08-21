import type { ApiKarmaOverview } from "@dicelette/api";
import { Box, Paper, Typography } from "@mui/material";
import { useI18n } from "@shared";
import StatCell from "../../characters/ui/StatCell";

const cardPaperSx = { p: 3 } as const;
const statsGridSx = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
	gap: 1,
	mt: 1.5,
} as const;

interface Props {
	server: ApiKarmaOverview["server"];
}

export default function KarmaServerStats({ server }: Props) {
	const { t } = useI18n();
	const { totalCount, avg, percent, rollTotal, usersWithCounts } = server;

	const cells: { name: string; value: string }[] = [
		{
			name: t("roll.success"),
			value: `[${totalCount.success}] ${t("karma.average")}: ${avg.success} (${percent.success}%)`,
		},
		{
			name: t("roll.failure"),
			value: `[${totalCount.failure}] ${t("karma.average")}: ${avg.failure} (${percent.failure}%)`,
		},
	];
	if (totalCount.criticalSuccess > 0) {
		cells.push({
			name: t("roll.critical.success"),
			value: `[${totalCount.criticalSuccess}] ${t("karma.average")}: ${avg.criticalSuccess} (${percent.criticalSuccess}%)`,
		});
	}
	if (totalCount.criticalFailure > 0) {
		cells.push({
			name: t("roll.critical.failure"),
			value: `[${totalCount.criticalFailure}] ${t("karma.average")}: ${avg.criticalFailure} (${percent.criticalFailure}%)`,
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
				{cells.map((cell) => (
					<StatCell key={cell.name} name={cell.name} value={cell.value} />
				))}
			</Box>
		</Paper>
	);
}
