import { ExpandMore } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import type { ReactNode } from "react";

const accordionSummarySx = { bgcolor: "action.hover" } as const;

interface Props {
	title: string;
	defaultExpanded?: boolean;
	children: ReactNode;
}

export default function FormAccordion({ title, defaultExpanded = false, children }: Props) {
	return (
		<Accordion defaultExpanded={defaultExpanded}>
			<AccordionSummary expandIcon={<ExpandMore />} sx={accordionSummarySx}>
				<Typography fontWeight={600}>{title}</Typography>
			</AccordionSummary>
			<AccordionDetails>{children}</AccordionDetails>
		</Accordion>
	);
}
