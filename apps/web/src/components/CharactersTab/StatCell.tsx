import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface Props {
	name: string;
	value: string;
}

export default function StatCell({ name, value }: Props) {
	const clean = value.replace(/^`+|`+$/g, "").trim();
	return (
		<Box
			sx={{
				bgcolor: "action.hover",
				borderRadius: 1,
				px: 1.5,
				py: 0.75,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Typography variant="caption" color="text.secondary" noWrap>
				{name}
			</Typography>
			<Typography variant="body2" fontFamily="var(--code-font-family)" noWrap>
				{clean}
			</Typography>
		</Box>
	);
}
