import { Box } from "@mui/material";
import type { FC, ReactNode } from "react";

import { AddButton } from ".";
import { SECTION_ROOT_SX } from "./styles";

type SectionProps = {
	children: ReactNode;
	label: string;
} & (
	| { onAdd?: never; length?: never; type?: never }
	| { onAdd: () => void; length: number; type: "macro" | "stats" | "critical" }
);

const Section: FC<SectionProps> = ({ length, type, children, onAdd }) => (
	<Box component="section" sx={SECTION_ROOT_SX}>
		{onAdd && <AddButton len={length} type={type} onClick={onAdd} />}
		{children}
	</Box>
);

export default Section;
