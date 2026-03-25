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
import { useI18n } from "../../../../shared/i18n";
import type { AttributeSectionProps } from "../../types";
import { exportJson } from "../../utils";
import AttributeRow from "./AttributeRow";

export default function AttributesSection({ state }: AttributeSectionProps) {
	const { t } = useI18n();
	const {
		data: attributes,
		newName,
		newValue,
		adding,
		addError,
		error,
		success,
		saving,
		importRef,
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

	return (
		<Accordion defaultExpanded>
			<AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: "action.hover" }}>
				<Typography fontWeight={600}>{t("userSettings.attributes.title").toTitle()}</Typography>
			</AccordionSummary>
			<AccordionDetails>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					{t("userSettings.attributes.description")}
				</Typography>
				<Stack spacing={1} sx={{ mb: 2 }}>
					{Object.entries(attributes).map(([name, value]) => (
						<AttributeRow
							key={name}
							name={name}
							value={value}
							onRename={onRename}
							onValueChange={onValueChange}
							onDelete={onDelete}
						/>
					))}
					{Object.keys(attributes).length === 0 && (
						<Typography
							variant="body2"
							color="text.secondary"
							sx={{ fontStyle: "italic", fontFamily: "var(--code-font-family)" }}
						>
							{t("userConfig.noAttributes")}
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
						sx={{ flex: 2, fontFamily: "var(--code-font-family)" }}
					/>
					<TextField
						size="small"
						label={t("userSettings.attributes.create.value.title").toTitle()}
						value={newValue}
						onChange={(e) => {
							setNewValue(e.target.value);
							setAddError(null);
						}}
						type="number"
						sx={{ flex: 1 }}
						onKeyDown={(e) => e.key === "Enter" && onAdd()}
					/>
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
					<Alert severity="warning" sx={{ mb: 1 }} onClose={() => setAddError(null)}>
						{addError}
					</Alert>
				)}
				{error && (
					<Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
						{error}
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
