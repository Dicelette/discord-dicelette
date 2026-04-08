import DeleteIcon from "@mui/icons-material/Delete";
import { Box, IconButton, TextField } from "@mui/material";
import { memo, useState } from "react";

export interface SnippetRowProps {
	name: string;
	value: string;
	error?: string;
	onRename: (oldName: string, newName: string) => string | null;
	onValueChange: (name: string, value: string) => void;
	onDelete: (name: string) => void;
}

const SnippetRow = memo(function SnippetRow({
	name,
	value,
	error,
	onRename,
	onValueChange,
	onDelete,
}: SnippetRowProps) {
	const [localName, setLocalName] = useState(name);
	const [localValue, setLocalValue] = useState(value);
	const [nameError, setNameError] = useState<string | null>(null);
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "flex-start",
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
				onChange={(e) => {
					setLocalName(e.target.value);
					setNameError(null);
				}}
				onBlur={() => {
					if (localName !== name) {
						const err = onRename(name, localName);
						if (err) {
							setLocalName(name);
							setNameError(err);
						}
					}
				}}
				error={Boolean(nameError)}
				helperText={nameError ?? undefined}
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
				error={Boolean(error)}
				helperText={error}
				sx={{ flex: 2 }}
				slotProps={{ htmlInput: { style: { fontFamily: "var(--code-font-family)" } } }}
			/>
			<Box
				sx={{
					display: "flex",
					alignSelf: "stretch",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<IconButton size="small" onClick={() => onDelete(name)}>
					<DeleteIcon fontSize="small" />
				</IconButton>
			</Box>
		</Box>
	);
});

export default SnippetRow;
