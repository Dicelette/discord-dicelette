import { Box, Typography } from "@mui/material";
import type { FC } from "react";

import { AddButton } from ".";

type SectionProps = {
	length?: number;
	type?: "macro" | "stats" | "critical";
	children: React.ReactNode;
	label: string;
	onAdd?: () => void;
};

const Section: FC<SectionProps> = ({ length, type, children, label, onAdd }) => (
	<Box component="section" sx={{ display: "flex", flexDirection: "column", mb: 2 }}>
		<Typography
			variant="subtitle1"
			fontWeight="bold"
			sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
		>
			{label}
			{onAdd && <AddButton len={length} type={type} onClick={onAdd} />}
		</Typography>
		{children}
	</Box>
);

export default Section;
