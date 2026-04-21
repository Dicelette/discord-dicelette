import { Box, Typography } from "@mui/material";

const cellBoxSx = {
	bgcolor: "action.hover",
	borderRadius: 1,
	px: 1.5,
	py: 0.75,
	display: "flex",
	flexDirection: "column",
	width: "100%",
	minWidth: 0,
} as const;

interface Props {
	name: string;
	value: string;
}

export default function StatCell({ name, value }: Props) {
	const clean = value.replace(/`/g, "").trim();
	const isLongValue = clean.length > 25;
	const isMidValue = clean.length > 15 && clean.length <= 25;
	const horizontalAlign = isLongValue ? "flex-start" : "center";
	const wrap = isMidValue ? "wrap" : "nowrap";
	const valueSx = {
		display: "block",
		overflowX: "auto",
		overflowY: "hidden",
		textOverflow: "clip",
		justifyContent: horizontalAlign,
		textWrap: wrap,
		scrollbarWidth: "thin",
		scrollbarColor: "rgba(90, 90, 90, 0.45) transparent",
		"&::-webkit-scrollbar": {
			backgroundColor: "transparent",
			height: 6,
			width: 0,
		},
		"&::-webkit-scrollbar-track": {
			backgroundColor: "transparent",
		},
		"&::-webkit-scrollbar-thumb": {
			backgroundColor: "rgba(90, 90, 90, 0.45)",
			borderRadius: 999,
		},
		"&:hover, &:focus-visible": {
			scrollbarColor: "rgba(70, 70, 70, 0.65) transparent",
		},
		"&:active": {
			scrollbarColor: "rgba(55, 55, 55, 0.8) transparent",
		},
		"&:hover::-webkit-scrollbar-thumb": {
			backgroundColor: "rgba(70, 70, 70, 0.65)",
		},
		"&:focus-visible::-webkit-scrollbar-thumb": {
			backgroundColor: "rgba(70, 70, 70, 0.65)",
		},
		"&:active::-webkit-scrollbar-thumb": {
			backgroundColor: "rgba(55, 55, 55, 0.8)",
		},
		width: "100%",
		minWidth: 0,
	};

	return (
		<Box sx={cellBoxSx}>
			<Typography
				variant="caption"
				component={"div"}
				sx={{
					color: "text.secondary",
				}}
			>
				{name}
			</Typography>
			<Typography
				variant="body2"
				component={"div"}
				tabIndex={0}
				sx={{
					fontFamily: "var(--code-font-family)",
					...valueSx,
					mx: "auto",
					alignItems: "center",
				}}
			>
				{clean}
			</Typography>
		</Box>
	);
}
