import { Draggable } from "@hello-pangea/dnd";
import { Autocomplete, Box, TextField, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { memo, type ReactElement, useCallback, useMemo } from "react";
import { Tablefield } from "../../Atoms";
import CopyButton from "../../Atoms/button/copyButton";
import RemoveButton from "../../Atoms/button/removeButton";
import StandaloneToggleButton from "../../Atoms/toggle-custom";
import type { DataForm } from "../../interfaces";
import { customCriticalErrorMessage } from "./errors";

export type Custom = DataForm["customCritical"][number];

const SIGN_OPTIONS = [">", ">=", "<", "<=", "==", "!="] as const;

const CODE_INPUT_SX = {
	width: { xs: "100%", xl: 200 },
	mb: 0,
	"& .MuiInputBase-input": { fontFamily: "var(--code-font-family)" },
} as const;

const ROW_SX = {
	display: "flex",
	flexDirection: { xs: "column", xl: "row" },
	alignItems: { xl: "center" },
	width: { xl: "100%" },
} as const;

const CELL_SX = { p: 1, width: { xs: "100%", xl: "auto" } } as const;
const BTN_CELL_SX = {
	p: { xs: 1, xl: "2px" },
	width: { xs: "100%", xl: "auto" },
} as const;

type CustomCriticalRowProps = {
	index: number;
	duplicateIndices: number[];
	push: (value: Custom) => void;
	remove: (index: number) => void;
	setFieldValue: (field: string, value: unknown) => unknown;
	customCritical: Custom[];
};

const CustomCriticalRow = ({
	index,
	duplicateIndices,
	push,
	remove,
	customCritical,
	setFieldValue,
}: CustomCriticalRowProps): ReactElement => {
	const custom = customCritical[index];
	const { onNaturalDice, affectSkill, selection } = custom;

	const selectionMsg = useMemo(
		() =>
			customCriticalErrorMessage({
				index,
				idName: "selection",
				duplicateIndices,
				customCritical: custom,
			}),
		[index, duplicateIndices, custom]
	);
	const nameMsg = useMemo(
		() =>
			customCriticalErrorMessage({
				index,
				idName: "name",
				duplicateIndices,
				customCritical: custom,
			}),
		[index, duplicateIndices, custom]
	);
	const formulaMsg = useMemo(
		() =>
			customCriticalErrorMessage({
				index,
				idName: "formula",
				duplicateIndices,
				customCritical: custom,
			}),
		[index, duplicateIndices, custom]
	);

	const handleCopy = useCallback(
		() =>
			push({
				selection: custom.selection,
				name: custom.name,
				formula: custom.formula,
				text: custom.text,
				onNaturalDice: custom.onNaturalDice,
				affectSkill: custom.affectSkill,
			}),
		[push, custom]
	);
	const handleRemove = useCallback(() => remove(index), [remove, index]);
	const handleSelectionChange = useCallback(
		(_e: React.SyntheticEvent, newValue: string | null) =>
			setFieldValue(`customCritical[${index}].selection`, newValue || ""),
		[setFieldValue, index]
	);
	const handleToggleNaturalDice = useCallback(
		() => setFieldValue(`customCritical[${index}].onNaturalDice`, !onNaturalDice),
		[setFieldValue, index, onNaturalDice]
	);
	const handleToggleAffectSkill = useCallback(
		() => setFieldValue(`customCritical[${index}].affectSkill`, !affectSkill),
		[setFieldValue, index, affectSkill]
	);

	const isDuplicate = duplicateIndices.includes(index);

	return (
		<Draggable
			key={custom.id || index}
			draggableId={String(custom.id || index)}
			index={index}
		>
			{(provided) => (
				<Box
					component="tr"
					ref={provided.innerRef}
					{...provided.draggableProps}
					{...provided.dragHandleProps}
					sx={{
						...ROW_SX,
						...(isDuplicate && {
							bgcolor: (t) => alpha(t.palette.error.main, 0.08),
						}),
					}}
				>
					<Box component="td" sx={BTN_CELL_SX}>
						<CopyButton maxLen={22} length={customCritical.length} onClick={handleCopy} />
					</Box>
					<Box component="td" sx={CELL_SX}>
						<Tooltip title={selectionMsg || ""} arrow placement="top">
							<span>
								<Autocomplete
									size="small"
									slotProps={{ paper: { className: "autocomplete" } }}
									id={`Critical-selection-${index}`}
									sx={CODE_INPUT_SX}
									options={SIGN_OPTIONS}
									value={selection || ""}
									onChange={handleSelectionChange}
									renderInput={(params) => (
										<TextField
											{...params}
											label="Signe"
											variant="outlined"
											sx={CODE_INPUT_SX}
											error={!!selectionMsg}
										/>
									)}
								/>
							</span>
						</Tooltip>
					</Box>
					<Box component="td" sx={CELL_SX}>
						<Tooltip title={nameMsg || ""} arrow placement="top">
							<span>
								<Tablefield
									name={`customCritical[${index}].name`}
									label="Nom"
									variant="outlined"
									id={`Critical-name-${index}`}
									error={!!nameMsg}
								/>
							</span>
						</Tooltip>
					</Box>
					<Box component="td" sx={CELL_SX}>
						<Tooltip title={formulaMsg || ""} arrow placement="top">
							<span>
								<Tablefield
									name={`customCritical[${index}].formula`}
									label="Formule"
									variant="outlined"
									id={`Critical-formula-${index}`}
									error={!!formulaMsg}
								/>
							</span>
						</Tooltip>
					</Box>
					<Box component="td" sx={CELL_SX}>
						<StandaloneToggleButton
							selected={onNaturalDice}
							onChange={handleToggleNaturalDice}
							opt="naturalDice"
						/>
					</Box>
					<Box component="td" sx={CELL_SX}>
						<StandaloneToggleButton
							selected={affectSkill}
							onChange={handleToggleAffectSkill}
							opt="affectSkill"
						/>
					</Box>
					<Box component="td" sx={BTN_CELL_SX}>
						<RemoveButton onClick={handleRemove} />
					</Box>
				</Box>
			)}
		</Draggable>
	);
};

export default memo(CustomCriticalRow);
