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
import { memo } from "react";
import type { SnippetsState } from "../..";
import { exportJson } from "../../utils.ts";
import SnippetRow from "../atoms/SnippetRow";

interface Props {
	state: SnippetsState;
}

function Snippets({ state }: Props) {
	const { t } = useI18n();
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
			<AccordionSummary
				expandIcon={<ExpandMore />}
				sx={{
					bgcolor: "action.hover",
					borderTopLeftRadius: "4px",
					borderTopRightRadius: "4px",
				}}
			>
				<Typography fontWeight={600}>{t("common.snippets").toTitle()}</Typography>
			</AccordionSummary>
			<AccordionDetails>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					{t("userConfig.snippetsDesc")}
				</Typography>
				<Stack spacing={1} sx={{ mb: 2 }}>
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
						<Typography
							variant="body2"
							color="text.secondary"
							sx={{ fontStyle: "italic" }}
						>
							{t("userSettings.snippets.list.empty")}
						</Typography>
					)}
				</Stack>
				<Box sx={{ display: "flex", gap: 1, mb: 1 }}>
					<TextField
						size="small"
						label={t("common.name").toTitle()}
						value={newName}
						onChange={(e) => {
							setNewName(e.target.value);
							setAddError(null);
						}}
						sx={{ flex: 1, fontFamily: "var(--code-font-family)" }}
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
						sx={{ flex: 2, fontFamily: "var(--code-font-family)" }}
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
					<Alert severity="warning" sx={{ mb: 1 }} onClose={() => setAddError(null)}>
						{addError}
					</Alert>
				)}
				{error && (
					<Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
						{error}
					</Alert>
				)}
				{warning && (
					<Alert severity="warning" sx={{ mb: 1 }} onClose={() => setWarning(null)}>
						{warning}
					</Alert>
				)}
				{success && (
					<Alert severity="success" sx={{ mb: 1 }}>
						{t("userConfig.saveSuccess")}
					</Alert>
				)}
				<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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
						style={{ display: "none" }}
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
