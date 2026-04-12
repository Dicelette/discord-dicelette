import { Box, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { FC, ReactNode } from "react";

import { AddButton } from ".";
import { mergeSx, SECTION_ROOT_SX, SECTION_TITLE_SX } from "./styles";

type SectionProps = {
	length?: number;
	type?: "macro" | "stats" | "critical";
	children: ReactNode;
	label: string;
	onAdd?: () => void;
	titleSx?: SxProps<Theme>;
};

const Section: FC<SectionProps> = ({ length, type, children, label, onAdd, titleSx }) => (
	<Box component="section" sx={SECTION_ROOT_SX}>
		<Typography variant="h6" fontWeight="bold" sx={mergeSx(SECTION_TITLE_SX, titleSx)}>
			{label}
			{onAdd && <AddButton len={length} type={type} onClick={onAdd} />}
		</Typography>
		{children}
	</Box>
);

export default Section;
