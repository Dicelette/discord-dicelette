import { ExpandLess, ExpandMore } from "@mui/icons-material";
import {
	Box,
	Collapse,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
} from "@mui/material";
import type { ReactNode } from "react";
import { useState } from "react";
import type { ActiveTab } from "./hooks/useDashboard";

export interface DashboardNavItem {
	value: ActiveTab;
	label: string;
	icon: ReactNode;
}

export interface DashboardNavGroup {
	id: string;
	label: string;
	icon: ReactNode;
	items: DashboardNavItem[];
}

const groupButtonSx = { borderRadius: 1.5, mb: 0.25 } as const;
const groupIconSx = { minWidth: 36 } as const;
const groupLabelSx = { primary: { sx: { fontWeight: 600 } } } as const;
const subItemSx = { borderRadius: 1.5, mb: 0.25, pl: 5 } as const;
const subItemIconSx = { minWidth: 32 } as const;

interface Props {
	groups: DashboardNavGroup[];
	current: ActiveTab;
	onSelect: (value: ActiveTab) => void;
}

export default function DashboardNav({ groups, current, onSelect }: Props) {
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

	const toggleGroup = (id: string) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	return (
		<List sx={{ py: 0 }} component="nav">
			{groups.map((group) => {
				const isOpen = !collapsedGroups.has(group.id);
				return (
					<Box key={group.id}>
						<ListItemButton onClick={() => toggleGroup(group.id)} sx={groupButtonSx}>
							<ListItemIcon sx={groupIconSx}>{group.icon}</ListItemIcon>
							<ListItemText primary={group.label} slotProps={groupLabelSx} />
							{isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
						</ListItemButton>
						<Collapse in={isOpen} timeout="auto">
							<List component="div" disablePadding>
								{group.items.map((item) => (
									<ListItemButton
										key={item.value}
										selected={current === item.value}
										onClick={() => onSelect(item.value)}
										sx={subItemSx}
									>
										<ListItemIcon sx={subItemIconSx}>{item.icon}</ListItemIcon>
										<ListItemText primary={item.label} />
									</ListItemButton>
								))}
							</List>
						</Collapse>
					</Box>
				);
			})}
		</List>
	);
}
