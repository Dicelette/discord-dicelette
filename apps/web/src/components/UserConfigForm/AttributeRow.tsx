import { Delete } from "@mui/icons-material";
import { Box, IconButton, TextField } from "@mui/material";

import { memo, useState } from "react";

export interface AttributeRowProps {
	name: string;
	value: number;
	onRename: (oldName: string, newName: string) => void;
	onValueChange: (name: string, value: number) => void;
	onDelete: (name: string) => void;
}

const AttributeRow = memo(function AttributeRow({
	name,
	value,
	onRename,
	onValueChange,
	onDelete,
}: AttributeRowProps) {
	const [localName, setLocalName] = useState(name);
	const [localValue, setLocalValue] = useState(String(value));
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 1,
				p: 1,
				borderRadius: 1,
				bgcolor: "background.paper",
				border: "1px solid",
				borderColor: "divider",
			}}
		>
			<TextField
				size="small"
				value={localName}
				onChange={(e) => setLocalName(e.target.value)}
				onBlur={() => {
					if (localName !== name) onRename(name, localName);
				}}
				sx={{ flex: 2 }}
				slotProps={{
					htmlInput: {
						style: { fontFamily: "var(--code-font-family)", fontWeight: 600 },
					},
				}}
			/>
			<TextField
				size="small"
				value={localValue}
				type="number"
				onChange={(e) => setLocalValue(e.target.value)}
				onBlur={() => {
					const val = Number.parseFloat(localValue);
					if (!Number.isNaN(val)) onValueChange(name, val);
				}}
				sx={{ flex: 1 }}
			/>
			<IconButton size="small" onClick={() => onDelete(name)}>
				<Delete fontSize="small" />
			</IconButton>
		</Box>
	);
});

export default AttributeRow;
