import { List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import type { ReactNode } from "react";
import type { ActiveTab } from "./hooks/useDashboard";

export interface DashboardNavItem {
	value: ActiveTab;
	label: string;
	icon: ReactNode;
}

const listItemSx = { borderRadius: 1.5, mb: 0.5 } as const;
const listItemIconSx = { minWidth: 36 } as const;

interface Props {
	items: DashboardNavItem[];
	current: ActiveTab;
	onSelect: (value: ActiveTab) => void;
}

export default function DashboardNav({ items, current, onSelect }: Props) {
	return (
		<List sx={{ py: 0 }}>
			{items.map((item) => (
				<ListItemButton
					key={item.value}
					selected={current === item.value}
					onClick={() => onSelect(item.value)}
					sx={listItemSx}
				>
					<ListItemIcon sx={listItemIconSx}>{item.icon}</ListItemIcon>
					<ListItemText primary={item.label} />
				</ListItemButton>
			))}
		</List>
	);
}
