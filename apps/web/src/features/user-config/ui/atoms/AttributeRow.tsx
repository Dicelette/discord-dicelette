import { Delete } from "@mui/icons-material";
import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import { memo, useEffect, useState } from "react";
import type { AttributeRowProps } from "../../types";

const boxSx = {
	display: "flex",
	alignItems: "center",
	gap: 1,
	p: 1,
	borderRadius: 1,
	bgcolor: "background.paper",
	border: "1px solid",
	borderColor: "divider",
	scrollBarWidth: "none",
} as const;

const keyframesShake = {
	"@keyframes shake": {
		"0%, 100%": { transform: "translateX(0)" },
		"20%": { transform: "translateX(-5px)" },
		"40%": { transform: "translateX(5px)" },
		"60%": { transform: "translateX(-3px)" },
		"80%": { transform: "translateX(3px)" },
	},
} as const;

const nameFieldSx = { flex: 2, ...keyframesShake } as const;
const nameFieldShakeSx = { ...nameFieldSx, animation: "shake 0.4s ease" } as const;
const valueFieldSx = { flex: 1 } as const;
const nameInputProps = {
	htmlInput: { style: { fontFamily: "var(--code-font-family)", fontWeight: 600 } },
} as const;

const errorTooltipSlotProps = {
	tooltip: { sx: { bgcolor: "error.main" } },
	arrow: { sx: { color: "error.main" } },
} as const;

const AttributeRow = memo(function AttributeRow({
	name,
	value,
	onRename,
	onValueChange,
	onDelete,
}: AttributeRowProps) {
	const [localName, setLocalName] = useState(name);
	const [localValue, setLocalValue] = useState(String(value));
	const [nameError, setNameError] = useState<string | null>(null);
	const [nameShaking, setNameShaking] = useState(false);

	useEffect(() => {
		if (nameError) {
			setNameShaking(true);
			const timer = setTimeout(() => setNameShaking(false), 400);
			return () => clearTimeout(timer);
		}
	}, [nameError]);

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
				type="number"
				onChange={(e) => setLocalValue(e.target.value)}
				onBlur={() => {
					const val = Number.parseFloat(localValue);
					if (!Number.isNaN(val)) onValueChange(name, val);
				}}
				sx={valueFieldSx}
			/>
			<IconButton size="small" onClick={() => onDelete(name)}>
				<Delete fontSize="small" />
			</IconButton>
		</Box>
	);
});

export default AttributeRow;
