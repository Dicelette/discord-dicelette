import { AutoAwesome, Bolt, Cancel, CheckCircle } from "@mui/icons-material";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { purple } from "@mui/material/colors";
import type { ReactNode } from "react";

export type KarmaTone = "success" | "failure" | "criticalSuccess" | "criticalFailure";

const TONE_ICON: Record<KarmaTone, ReactNode> = {
	success: <CheckCircle fontSize="small" />,
	failure: <Cancel fontSize="small" />,
	criticalSuccess: <AutoAwesome fontSize="small" />,
	criticalFailure: <Bolt fontSize="small" />,
};

const tileSx = {
	display: "flex",
	alignItems: "center",
	gap: 1.5,
	p: 1.5,
	borderRadius: 2,
	border: "1px solid",
	minWidth: 0,
} as const;

interface Props {
	tone: KarmaTone;
	label: string;
	value: number;
	/** Supporting line under the value, e.g. a percentage or a per-user average. */
	caption?: string;
	/** Extra content under the caption — e.g. a streak indicator for this category. */
	extra?: ReactNode;
}

export default function KarmaStatTile({ tone, label, value, caption, extra }: Props) {
	const theme = useTheme();
	const toneColor =
		tone === "success"
			? theme.palette.success.main
			: tone === "failure"
				? theme.palette.error.main
				: tone === "criticalSuccess"
					? theme.palette.warning.main
					: purple[400];
	const isDark = theme.palette.mode === "dark";

	return (
		<Box
			sx={{
				...tileSx,
				bgcolor: alpha(toneColor, isDark ? 0.16 : 0.08),
				borderColor: alpha(toneColor, isDark ? 0.4 : 0.28),
			}}
		>
			<Box sx={{ color: toneColor, display: "flex" }}>{TONE_ICON[tone]}</Box>
			<Box sx={{ minWidth: 0 }}>
				<Typography
					variant="caption"
					noWrap
					sx={{ color: "text.secondary", display: "block" }}
				>
					{label}
				</Typography>
				<Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
					{value}
				</Typography>
				{caption && (
					<Typography variant="caption" noWrap sx={{ color: "text.secondary" }}>
						{caption}
					</Typography>
				)}
				{extra && <Box sx={{ mt: 0.75 }}>{extra}</Box>}
			</Box>
		</Box>
	);
}
