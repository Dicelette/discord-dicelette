import Typography from "@mui/material/Typography";
import { memo } from "react";

const SectionTitle = memo(({ children }: { children: React.ReactNode }) => (
	<Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1, opacity: 0.9 }}>
		{children}
	</Typography>
));
SectionTitle.displayName = "SectionTitle";

export default SectionTitle;
