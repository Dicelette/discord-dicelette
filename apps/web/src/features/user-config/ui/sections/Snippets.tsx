import { Add, ExpandMore, FileDownload, FileUpload } from "@mui/icons-material";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	CircularProgress,
	Stack,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { memo, useEffect, useState } from "react";
import type { SnippetsState } from "../..";
import { exportJson } from "../../utils.ts";
import SnippetRow from "../atoms/SnippetRow";

const accordionSummarySx = {
	bgcolor: "action.hover",
	borderTopLeftRadius: "4px",
	borderTopRightRadius: "4px",
} as const;
const stackSx = { mb: 2 } as const;
const emptyTextSx = { fontStyle: "italic" } as const;
const addRowBoxSx = { display: "flex", gap: 1, mb: 1 } as const;
const newNameFieldSx = { flex: 1, fontFamily: "var(--code-font-family)" } as const;
const newValueFieldSx = { flex: 2, fontFamily: "var(--code-font-family)" } as const;
const alertMbSx = { mb: 1 } as const;
const alertShakeSx = {
	mb: 1,
	"@keyframes shake": {
		"0%, 100%": { transform: "translateX(0)" },
		"20%": { transform: "translateX(-5px)" },
		"40%": { transform: "translateX(5px)" },
		"60%": { transform: "translateX(-3px)" },
		"80%": { transform: "translateX(3px)" },
	},
	animation: "shake 0.4s ease",
} as const;
const actionsBoxSx = { display: "flex", gap: 1, flexWrap: "wrap" } as const;
const descriptionSx = { mb: 2 } as const;
const inputHiddenStyle = { display: "none" } as const;

interface Props {
	state: SnippetsState;
}

function Snippets({ state }: Props) {
	const { t } = useI18n();
	const [addErrorShaking, setAddErrorShaking] = useState(false);
	useEffect(() => {
		if (state.addError) {
			setAddErrorShaking(true);
			const timer = setTimeout(() => setAddErrorShaking(false), 400);
			return () => clearTimeout(timer);
		}
	}, [state.addError]);
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

	return (
		<Accordion defaultExpanded>
			<AccordionSummary expandIcon={<ExpandMore />} sx={accordionSummarySx}>
				<Typography fontWeight={600}>{t("common.snippets").toTitle()}</Typography>
			</AccordionSummary>
			<AccordionDetails>
				<Typography variant="body2" color="text.secondary" sx={descriptionSx}>
					{t("userConfig.snippetsDesc")}
				</Typography>
				<Stack spacing={1} sx={stackSx}>
					{Object.entries(snippets).map(([name, value]) => (
						<SnippetRow
							key={name}
							name={name}
							value={value}
							error={entryErrors[name]}
							onRename={onRename}
							onValueChange={onValueChange}
							onDelete={onDelete}
						/>
					))}
					{Object.keys(snippets).length === 0 && (
						<Typography variant="body2" color="text.secondary" sx={emptyTextSx}>
							{t("userSettings.snippets.list.empty")}
						</Typography>
					)}
				</Stack>
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
