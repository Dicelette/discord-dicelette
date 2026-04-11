import Typography from "@mui/material/Typography";
import type React from "react";
import { memo } from "react";

const sectionTitleSx = {
	mx: -3,
	mt: -3,
	mb: 2,
	px: 3,
	py: 1.5,
	borderBottom: "1px solid",
	borderColor: "divider",
	borderRadius: "var(--Paper-radius, 4px) var(--Paper-radius, 4px) 0 0",
	bgcolor: "action.hover",
} as const;

const SectionTitle = memo(({ children }: { children: React.ReactNode }) => (
	<Typography variant="subtitle1" fontWeight={600} sx={sectionTitleSx}>
		{children}
	</Typography>
));
SectionTitle.displayName = "SectionTitle";

export default SectionTitle;
