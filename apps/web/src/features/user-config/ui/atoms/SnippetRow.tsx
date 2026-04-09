import DeleteIcon from "@mui/icons-material/Delete";
import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import { memo, useState } from "react";
import { useShake } from "../../hooks";
import { SHAKE_KEYFRAMES } from "./styles";

export interface SnippetRowProps {
	name: string;
	value: string;
	error?: string;
	onRename: (oldName: string, newName: string) => string | null;
	onValueChange: (name: string, value: string) => void;
	onDelete: (name: string) => void;
}

const boxSx = {
	display: "flex",
	alignItems: "center",
	gap: 1,
	p: 1,
	borderRadius: 1,
	bgcolor: "background.paper",
	border: "1px solid",
	borderColor: "divider",
} as const;

const nameFieldSx = { flex: 1, ...SHAKE_KEYFRAMES } as const;
const nameFieldShakeSx = { ...nameFieldSx, animation: "shake 0.4s ease" } as const;
const valueFieldSx = { flex: 2, ...SHAKE_KEYFRAMES } as const;
const valueFieldShakeSx = { ...valueFieldSx, animation: "shake 0.4s ease" } as const;
const nameInputProps = {
	htmlInput: { style: { fontFamily: "var(--code-font-family)", fontWeight: 600 } },
} as const;

const errorTooltipSlotProps = {
	tooltip: { sx: { bgcolor: "error.main" } },
	arrow: { sx: { color: "error.main" } },
} as const;
const valueInputProps = {
	htmlInput: { style: { fontFamily: "var(--code-font-family)" } },
} as const;
const deleteButtonBoxSx = {
	display: "flex",
	alignSelf: "stretch",
	alignItems: "center",
	justifyContent: "center",
} as const;

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
	const nameShaking = useShake(nameError);
	const valueShaking = useShake(error);
	return (
		<Box sx={boxSx}>
			<Tooltip
				open={Boolean(nameError)}
				title={nameError ?? ""}
				arrow
				placement="top"
				slotProps={errorTooltipSlotProps}
			>
				<TextField
					size="small"
					value={localName}
					onClick={() => setNameError(null)}
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
					sx={nameShaking ? nameFieldShakeSx : nameFieldSx}
					slotProps={nameInputProps}
				/>
			</Tooltip>
			<TextField
				size="small"
				value={localValue}
				onChange={(e) => setLocalValue(e.target.value)}
				onBlur={() => onValueChange(name, localValue)}
				placeholder="2d6+3"
				error={Boolean(error)}
				sx={valueShaking ? valueFieldShakeSx : valueFieldSx}
				slotProps={valueInputProps}
			/>
			<Box sx={deleteButtonBoxSx}>
				<IconButton size="small" onClick={() => onDelete(name)}>
					<DeleteIcon fontSize="small" />
				</IconButton>
			</Box>
		</Box>
	);
});

export default SnippetRow;
