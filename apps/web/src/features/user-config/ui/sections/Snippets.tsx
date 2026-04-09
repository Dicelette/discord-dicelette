import { Add, ExpandMore, FileDownload, FileUpload } from "@mui/icons-material";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	CircularProgress,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { memo, useEffect, useMemo, useRef } from "react";
import { List, type RowComponentProps, useListRef } from "react-window";
import type { SnippetsState } from "../..";
import { useShake } from "../../hooks";
import { exportJson } from "../../utils.ts";
import SnippetRow from "../atoms/SnippetRow";
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
	MAX_LIST_HEIGHT,
} from "./styles.ts";

const accordionSummarySx = {
	bgcolor: "action.hover",
	borderTopLeftRadius: "4px",
	borderTopRightRadius: "4px",
} as const;
const newNameFieldSx = { flex: 1 } as const;
const newValueFieldSx = { flex: 2 } as const;

interface SnippetItemData {
	entries: [string, string][];
	entryErrors: Record<string, string | undefined>;
	onRename: (oldName: string, newName: string) => string | null;
	onValueChange: (name: string, value: string) => void;
	onDelete: (name: string) => void;
}

function SnippetItem({
	index,
	style,
	entries,
	entryErrors,
	onRename,
	onValueChange,
	onDelete,
}: RowComponentProps<SnippetItemData>) {
	const [name, value] = entries[index];
	return (
		<div style={style}>
			<SnippetRow
				key={name}
				name={name}
				value={value}
				error={entryErrors[name]}
				onRename={onRename}
				onValueChange={onValueChange}
				onDelete={onDelete}
			/>
		</div>
	);
}

interface Props {
	state: SnippetsState;
}

function Snippets({ state }: Props) {
	const { t } = useI18n();
	const addErrorShaking = useShake(state.addError);
	const {
		data: snippets,
		entryErrors,
		newName,
		newValue,
		adding,
		addError,
		error,
		warning,
		success,
		saving,
		importRef,
		setNewName,
		setNewValue,
		setAddError,
		setError,
		setWarning,
		onRename,
		onValueChange,
		onDelete,
		onAdd,
		onSave,
		onImportChange,
	} = state;

	const entries = useMemo(
		() => Object.entries(snippets) as [string, string][],
		[snippets]
	);
	const itemData = useMemo<SnippetItemData>(
		() => ({ entries, entryErrors, onRename, onValueChange, onDelete }),
		[entries, entryErrors, onRename, onValueChange, onDelete]
	);

	const listStyle = {
		height: Math.min(entries.length * ITEM_SIZE, MAX_LIST_HEIGHT),
		width: "100%" as const,
		scrollbarWidth: "thin" as const,
		scrollbarColor: "rgba(255, 255, 255, 0.2) transparent",
	};
	const listRef = useListRef(null);
	const prevCountRef = useRef(entries.length);
	useEffect(() => {
		if (entries.length > prevCountRef.current) {
			listRef.current?.scrollToRow({ index: entries.length - 1, align: "end" });
		}
		prevCountRef.current = entries.length;
	}, [entries.length, listRef]);

	return (
		<Accordion defaultExpanded>
			<AccordionSummary expandIcon={<ExpandMore />} sx={accordionSummarySx}>
				<Typography fontWeight={600}>{t("common.snippets").toTitle()}</Typography>
			</AccordionSummary>
			<AccordionDetails>
				<Typography variant="body2" color="text.secondary" sx={descriptionSx}>
					{t("userConfig.snippetsDesc")}
				</Typography>
				{entries.length === 0 ? (
					<Typography variant="body2" color="text.secondary" sx={emptyTextSx}>
						{t("userSettings.snippets.list.empty")}
					</Typography>
				) : (
					<Box sx={listBoxSx}>
						<List
							listRef={listRef}
							rowCount={entries.length}
							rowHeight={ITEM_SIZE}
							rowProps={itemData}
							rowComponent={SnippetItem}
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
					<TextField
						size="small"
						label={t("common.dice").toTitle()}
						value={newValue}
						onChange={(e) => {
							setNewValue(e.target.value);
							setAddError(null);
						}}
						placeholder="2d6+3"
						sx={newValueFieldSx}
						slotProps={codeInputSlotProps}
						onKeyDown={(e) => e.key === "Enter" && onAdd()}
					/>
					<Button
						variant="outlined"
						startIcon={adding ? <CircularProgress size={16} /> : <Add />}
						onClick={onAdd}
						disabled={adding || !newName.trim() || !newValue.trim()}
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
				{warning && (
					<Alert severity="warning" sx={alertMbSx} onClose={() => setWarning(null)}>
						{warning}
					</Alert>
				)}
				{success && (
					<Alert severity="success" sx={alertMbSx}>
						{t("userConfig.saveSuccess")}
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
								onClick={() => exportJson(snippets, "snippets.json")}
								disabled={Object.keys(snippets).length === 0}
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
			</AccordionDetails>
		</Accordion>
	);
}

export default memo(Snippets);
