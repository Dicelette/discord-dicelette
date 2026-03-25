import DeleteIcon from "@mui/icons-material/Delete";
import { Box, IconButton, TextField } from "@mui/material";
import { memo, useState } from "react";

export interface SnippetRowProps {
	name: string;
	value: string;
	onRename: (oldName: string, newName: string) => void;
	onValueChange: (name: string, value: string) => void;
	onDelete: (name: string) => void;
}

const SnippetRow = memo(function SnippetRow({
	name,
	value,
	onRename,
	onValueChange,
	onDelete,
}: SnippetRowProps) {
	const [localName, setLocalName] = useState(name);
	const [localValue, setLocalValue] = useState(value);
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
				sx={{ flex: 1 }}
				slotProps={{
					htmlInput: {
						style: { fontFamily: "var(--code-font-family)", fontWeight: 600 },
					},
				}}
			/>
			<TextField
				size="small"
				value={localValue}
				onChange={(e) => setLocalValue(e.target.value)}
				onBlur={() => onValueChange(name, localValue)}
				placeholder="2d6+3"
				sx={{ flex: 2 }}
				slotProps={{ htmlInput: { style: { fontFamily: "var(--code-font-family)" } } }}
			/>
			<IconButton size="small" onClick={() => onDelete(name)}>
				<DeleteIcon fontSize="small" />
			</IconButton>
		</Box>
	);
});

export default SnippetRow;
