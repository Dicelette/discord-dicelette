import { Add, FileDownload, FileUpload } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { resolveFormulaHint, useI18n } from "@shared";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { List, type RowComponentProps } from "react-window";
import type { AttributeSectionProps } from "../../types.ts";
import { exportJson } from "../../utils.ts";
import { AttributeRow, FormAccordion } from "../atoms";
import {
	actionsBoxSx,
	addRowBoxSx,
	alertMbSx,
	alertShakeSx,
	codeInputSlotProps,
	descriptionSx,
	emptyTextSx,
	ITEM_SIZE,
	inputHiddenStyle,
	listBoxSx,
} from "./styles.ts";
import { useAutoScrollToNewItem, useListStyle, useSaveSuccessToast } from "./hooks";

const newNameFieldSx = { flex: 2 } as const;
const newValueFieldSx = { flex: 1 } as const;

const errorTooltipSlotProps = {
	tooltip: { sx: { bgcolor: "error.main" } },
	arrow: { sx: { color: "error.main" } },
} as const;

const hintTooltipSlotProps = {
	tooltip: { sx: { bgcolor: "grey.700" } },
	arrow: { sx: { color: "grey.700" } },
} as const;
const replaceUnknownFieldSx = { mb: 2, fontFamily: "var(--code-font-family)" } as const;

interface AttributeItemData {
	entries: [string, number | string][];
	allData: Record<string, number | string>;
	onRename: (oldName: string, newName: string) => string | null;
	onValueChange: (name: string, value: string) => void;
	onDelete: (name: string) => void;
}

function AttributeItem({
	index,
	style,
	entries,
	allData,
	onRename,
	onValueChange,
	onDelete,
}: RowComponentProps<AttributeItemData>) {
	const [name, value] = entries[index];
	return (
		<div style={style}>
			<AttributeRow
				key={name}
				name={name}
				value={value}
				allData={allData}
				onRename={onRename}
				onValueChange={onValueChange}
				onDelete={onDelete}
			/>
		</div>
	);
}

function Attributes({ state }: AttributeSectionProps) {
	const { t } = useI18n();
	const tRef = useRef(t);
	tRef.current = t;

	const [addErrorShaking, setAddErrorShaking] = useState(false);
	const [addFormulaHint, setAddFormulaHint] = useState<string | null>(null);
	const [addFormulaError, setAddFormulaError] = useState(false);
	const [addValueFocused, setAddValueFocused] = useState(false);
	useEffect(() => {
		if (state.addError) {
			setAddErrorShaking(true);
			const timer = setTimeout(() => setAddErrorShaking(false), 400);
			return () => clearTimeout(timer);
		}
	}, [state.addError]);
	const {
		data: attributes,
		replaceUnknown,
		newName,
		newValue,
		adding,
		addError,
		error,
		success,
		saving,

		importRef,
		setReplaceUnknown,
		setNewName,
		setNewValue,
		setAddError,
		setError,
		onRename,
		onValueChange,
		onDelete,
		onAdd,
		onSave,
		onImportChange,
	} = state;

	useSaveSuccessToast(success);

	const entries = useMemo(
		() => Object.entries(attributes) as [string, number | string][],
		[attributes]
	);
	const itemData = useMemo<AttributeItemData>(
		() => ({ entries, allData: attributes, onRename, onValueChange, onDelete }),
		[entries, attributes, onRename, onValueChange, onDelete]
	);

	const listStyle = useListStyle(entries.length);

	useEffect(() => {
		const trimmed = newValue.trim();
		if (!trimmed) {
			setAddFormulaHint(null);
			setAddFormulaError(false);
			return;
		}
		const timer = setTimeout(() => {
			const snapshot = { ...attributes, [newName.trim()]: trimmed };
			const hint = resolveFormulaHint(trimmed, snapshot);
			if (hint.kind === "resolved") {
				setAddFormulaHint(
					tRef.current("userConfig.formulaResolved", { value: hint.value })
				);
				setAddFormulaError(false);
			} else if (hint.kind === "error") {
				setAddFormulaHint(tRef.current("userConfig.formulaError"));
				setAddFormulaError(true);
			} else {
				setAddFormulaHint(null);
				setAddFormulaError(false);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [newValue, newName, attributes]); // tRef stable — excluded intentionally

	const listRef = useAutoScrollToNewItem(entries.length);

	return (
		<FormAccordion title={t("userSettings.attributes.title").toTitle()} defaultExpanded>
			<Box paddingTop={"1rem"}>
				<TextField
					fullWidth
					size="small"
					label={t("userConfig.replaceUnknown.title")}
					helperText={t("userConfig.replaceUnknown.description")}
					value={replaceUnknown}
					onChange={(e) => {
						setReplaceUnknown(e.target.value);
						setError(null);
					}}
					onKeyDown={(e) => e.key === "Enter" && onSave()}
					sx={replaceUnknownFieldSx}
				/>
			</Box>
			<Typography
				variant="h6"
				fontSize={"1rem"}
				borderTop={"1px solid rgba(255, 255, 255, 0.12)"}
				paddingTop={"12px"}
				gutterBottom
			>
				{t("userConfig.sections.attributes")}
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={descriptionSx}>
				{t("userSettings.attributes.description")}
			</Typography>
			{entries.length === 0 ? (
				<Typography variant="body2" color="text.secondary" sx={emptyTextSx}>
					{t("userConfig.noAttributes")}
				</Typography>
			) : (
				<Box sx={listBoxSx}>
					<List
						listRef={listRef}
						rowCount={entries.length}
						rowHeight={ITEM_SIZE}
						rowProps={itemData}
						rowComponent={AttributeItem}
						style={listStyle}
					/>
				</Box>
			)}
			<Box sx={addRowBoxSx}>
				<TextField
					size="small"
					label={t("common.name").toTitle()}
					value={newName}
					onChange={(e) => {
						setNewName(e.target.value);
						setAddError(null);
					}}
					sx={newNameFieldSx}
					slotProps={codeInputSlotProps}
				/>
				<Tooltip
					title={addFormulaHint ?? ""}
					open={Boolean(addFormulaHint) && addValueFocused ? true : undefined}
					arrow
					placement="top"
					slotProps={addFormulaError ? errorTooltipSlotProps : hintTooltipSlotProps}
				>
					<TextField
						size="small"
						label={t("userSettings.attributes.create.value.title").toTitle()}
						value={newValue}
						onChange={(e) => {
							setNewValue(e.target.value);
							setAddError(null);
						}}
						onFocus={() => setAddValueFocused(true)}
						onBlur={() => setAddValueFocused(false)}
						sx={newValueFieldSx}
						error={addFormulaError}
						onKeyDown={(e) => e.key === "Enter" && onAdd()}
					/>
				</Tooltip>
				<Button
					variant="outlined"
					startIcon={adding ? <CircularProgress size={16} /> : <Add />}
					onClick={onAdd}
					disabled={adding || !newName.trim() || newValue === ""}
				>
					{t("common.add")}
				</Button>
			</Box>

			{addError && (
				<Alert
					severity="warning"
					sx={addErrorShaking ? alertShakeSx : alertMbSx}
					onClose={() => setAddError(null)}
				>
					{addError}
				</Alert>
			)}
			{error && (
				<Alert severity="error" sx={alertMbSx} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			<Box sx={actionsBoxSx}>
				<Button
					variant="contained"
					onClick={onSave}
					disabled={saving}
					startIcon={saving ? <CircularProgress size={16} /> : undefined}
				>
					{saving ? t("common.saving") : t("common.save")}
				</Button>
				<Tooltip title={t("userConfig.exportTooltip")}>
					<span>
						<Button
							variant="outlined"
							startIcon={<FileDownload />}
							onClick={() => exportJson(attributes, "attributes.json")}
							disabled={Object.keys(attributes).length === 0}
						>
							{t("export.name").toTitle()}
						</Button>
					</span>
				</Tooltip>
				<input
					ref={importRef}
					type="file"
					accept=".json,application/json"
					style={inputHiddenStyle}
					onChange={onImportChange as never}
				/>
				<Tooltip title={t("userConfig.importTooltip")}>
					<Button
						variant="outlined"
						startIcon={<FileUpload />}
						onClick={() => importRef.current?.click()}
					>
						{t("import.name").toTitle()}
					</Button>
				</Tooltip>
			</Box>
		</FormAccordion>
	);
}

export default memo(Attributes);
