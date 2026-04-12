import { Draggable } from "@hello-pangea/dnd";
import { Autocomplete, Box, TextField, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useI18n } from "@shared";
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
	item?: Custom;
	isDuplicate?: boolean;
	length?: number;
	duplicateIndices?: number[];
	customCritical?: Custom[];
	push: (value: Custom) => void;
	remove: (index: number) => void;
	setFieldValue: (field: string, value: unknown) => unknown;
};

const CustomCriticalRow = ({
	index,
	item,
	isDuplicate,
	length,
	duplicateIndices,
	customCritical,
	push,
	remove,
	setFieldValue,
}: CustomCriticalRowProps): ReactElement => {
	const { t } = useI18n();
	const custom = item ??
		customCritical?.[index] ?? {
			selection: ">=",
			name: "",
			formula: "",
			text: "",
			onNaturalDice: false,
			affectSkill: false,
		};
	const normalizedDuplicate =
		isDuplicate ?? (duplicateIndices ? duplicateIndices.includes(index) : false);
	const normalizedLength = length ?? customCritical?.length ?? 0;
	const { onNaturalDice, affectSkill, selection } = custom;

	const selectionMsgKey = useMemo(
		() =>
			customCriticalErrorMessage({
				index,
				idName: "selection",
				isDuplicate: normalizedDuplicate,
				duplicateIndices,
				customCritical: custom,
			}),
		[index, normalizedDuplicate, duplicateIndices, custom]
	);
	const nameMsgKey = useMemo(
		() =>
			customCriticalErrorMessage({
				index,
				idName: "name",
				isDuplicate: normalizedDuplicate,
				duplicateIndices,
				customCritical: custom,
			}),
		[index, normalizedDuplicate, duplicateIndices, custom]
	);
	const formulaMsgKey = useMemo(
		() =>
			customCriticalErrorMessage({
				index,
				idName: "formula",
				isDuplicate: normalizedDuplicate,
				duplicateIndices,
				customCritical: custom,
			}),
		[index, normalizedDuplicate, duplicateIndices, custom]
	);

	const selectionMsg = selectionMsgKey ? t(selectionMsgKey) : "";
	const nameMsg = nameMsgKey ? t(nameMsgKey) : "";
	const formulaMsg = formulaMsgKey ? t(formulaMsgKey) : "";

	const handleCopy = useCallback(
		() =>
			push({
				id: (
					globalThis as { crypto?: { randomUUID?: () => string } }
				).crypto?.randomUUID?.(),
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
						...(normalizedDuplicate && {
							bgcolor: (t) => alpha(t.palette.error.main, 0.08),
						}),
					}}
				>
					<Box component="td" sx={BTN_CELL_SX}>
						<CopyButton maxLen={22} length={normalizedLength} onClick={handleCopy} />
					</Box>
					<Box component="td" sx={CELL_SX}>
						<Tooltip title={selectionMsg} arrow placement="top">
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
											label={t("template.sign")}
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
						<Tooltip title={nameMsg} arrow placement="top">
							<span>
								<Tablefield
									name={`customCritical[${index}].name`}
									label={t("template.name")}
									variant="outlined"
									id={`Critical-name-${index}`}
									error={!!nameMsg}
								/>
							</span>
						</Tooltip>
					</Box>
					<Box component="td" sx={CELL_SX}>
						<Tooltip title={formulaMsg} arrow placement="top">
							<span>
								<Tablefield
									name={`customCritical[${index}].formula`}
									label={t("template.formula")}
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
