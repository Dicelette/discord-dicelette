import { Delete } from "@mui/icons-material";
import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import { resolveFormulaHint, useI18n } from "@shared";
import { memo, useEffect, useRef, useState } from "react";
import { useShake } from "../../hooks";
import type { AttributeRowProps } from "../../types";
import { SHAKE_KEYFRAMES } from "./styles";

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

const nameFieldSx = { flex: 2, ...SHAKE_KEYFRAMES } as const;
const nameFieldShakeSx = { ...nameFieldSx, animation: "shake 0.4s ease" } as const;
const valueFieldSx = { flex: 1 } as const;
const nameInputProps = {
	htmlInput: { style: { fontFamily: "var(--code-font-family)", fontWeight: 600 } },
} as const;

const errorTooltipSlotProps = {
	tooltip: { sx: { bgcolor: "error.main" } },
	arrow: { sx: { color: "error.main" } },
} as const;

const hintTooltipSlotProps = {
	tooltip: { sx: { bgcolor: "grey.700" } },
	arrow: { sx: { color: "grey.700" } },
} as const;

const AttributeRow = memo(function AttributeRow({
	name,
	value,
	allData,
	onRename,
	onValueChange,
	onDelete,
}: AttributeRowProps) {
	const { t } = useI18n();
	const tRef = useRef(t);
	tRef.current = t;

	const [localName, setLocalName] = useState(name);
	const [localValue, setLocalValue] = useState(String(value));
	const [nameError, setNameError] = useState<string | null>(null);
	const [formulaHint, setFormulaHint] = useState<string | null>(null);
	const [formulaError, setFormulaError] = useState(false);
	const [valueFocused, setValueFocused] = useState(false);
	const nameShaking = useShake(nameError);

	useEffect(() => {
		const trimmed = localValue.trim();
		if (!trimmed) {
			setFormulaHint(null);
			setFormulaError(false);
			return;
		}
		const timer = setTimeout(() => {
			const snapshot = { ...allData, [name]: trimmed };
			const hint = resolveFormulaHint(trimmed, snapshot);
			if (hint.kind === "resolved") {
				setFormulaHint(tRef.current("userConfig.formulaResolved", { value: hint.value }));
				setFormulaError(false);
			} else if (hint.kind === "error") {
				setFormulaHint(tRef.current("userConfig.formulaError"));
				setFormulaError(true);
			} else {
				setFormulaHint(null);
				setFormulaError(false);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [localValue, allData, name]); // tRef stable — excluded intentionally

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
			<Tooltip
				title={formulaHint ?? ""}
				open={Boolean(formulaHint) && valueFocused}
				arrow
				placement="top"
				slotProps={formulaError ? errorTooltipSlotProps : hintTooltipSlotProps}
			>
				<TextField
					size="small"
					value={localValue}
					onChange={(e) => setLocalValue(e.target.value)}
					onFocus={() => setValueFocused(true)}
					onBlur={() => {
						setValueFocused(false);
						onValueChange(name, localValue.trim());
					}}
					sx={valueFieldSx}
					error={formulaError}
				/>
			</Tooltip>
			<IconButton size="small" onClick={() => onDelete(name)}>
				<Delete fontSize="small" />
			</IconButton>
		</Box>
	);
});

export default AttributeRow;
