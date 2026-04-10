import { Delete, Download, Upload } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography,
} from "@mui/material";
import { getChannelPathById, type Props, SectionTitle, useI18n } from "@shared";
import { exportJson } from "../user-config/utils.ts";
import { useTemplateManager } from "./hooks";
import { TemplateModal, TemplateView } from "./sections";

const alertMbSx = { mb: 2 } as const;
const actionsBoxSx = { display: "flex", gap: 1, mb: 2, flexWrap: "wrap" } as const;

export default function TemplateManager({
	guildId,
	channels,
	defaultPublicChannelId,
	defaultPrivateChannelId,
	defaultTemplateChannelId,
}: Props & {
	defaultPublicChannelId?: string;
	defaultPrivateChannelId?: string;
	defaultTemplateChannelId?: string;
}) {
	const { t } = useI18n();
	const {
		template,
		loading,
		error,
		success,
		saving,
		confirmDelete,
		importModalOpen,
		hasCharacters,
		templateChannelId,
		publicChannelId,
		privateChannelId,
		dispatch,
		handleModalImport,
		handleExportCharacters,
		handleDelete,
	} = useTemplateManager(
		guildId,
		defaultTemplateChannelId,
		defaultPublicChannelId,
		defaultPrivateChannelId
	);

	return (
		<>
			<SectionTitle>{t("common.template").toTitle()}</SectionTitle>

			{error && (
				<Alert
					severity="error"
					sx={alertMbSx}
					onClose={() => dispatch({ type: "set_error", value: null })}
				>
					{error}
				</Alert>
			)}
			{success && (
				<Alert
					severity="success"
					sx={alertMbSx}
					onClose={() => dispatch({ type: "set_success", value: null })}
				>
					{success}
				</Alert>
			)}

			<Box sx={actionsBoxSx}>
				<Button
					variant="outlined"
					startIcon={<Download />}
					onClick={() => dispatch({ type: "import_modal", value: true })}
					disabled={saving || loading}
					size="small"
				>
					{t("import.name").toTitle()}
				</Button>

				{template && (
					<>
						<Button
							variant="outlined"
							startIcon={<Upload />}
							onClick={() => exportJson(template, "template.json")}
							size="small"
						>
							{t("export.name").toTitle()}
						</Button>
						{hasCharacters && (
							<Button
								variant="outlined"
								startIcon={<Upload />}
								onClick={handleExportCharacters}
								size="small"
							>
								{t("template.exportCharacters")}
							</Button>
						)}
						<Button
							variant="outlined"
							color="error"
							startIcon={<Delete />}
							onClick={() => dispatch({ type: "confirm_delete", value: true })}
							disabled={saving}
							size="small"
						>
							{t("template.delete")}
						</Button>
					</>
				)}
			</Box>

			{loading ? (
				<CircularProgress size={24} />
			) : !template ? (
				<Typography variant="body2" color="text.secondary">
					{t("config.noTemplate")}
				</Typography>
			) : (
				<TemplateView
					template={template}
					defaultTemplateChannel={getChannelPathById(templateChannelId, channels)}
					defaultPrivateChannel={getChannelPathById(privateChannelId, channels)}
					defaultPublicChannel={getChannelPathById(publicChannelId, channels)}
				/>
			)}

			<TemplateModal
				open={importModalOpen}
				onClose={() => dispatch({ type: "import_modal", value: false })}
				onImport={handleModalImport}
				channels={channels}
				hasCharacters={hasCharacters}
				defaultTemplateChannelId={templateChannelId}
				defaultPublicChannelId={publicChannelId}
				defaultPrivateChannelId={privateChannelId}
			/>

			<Dialog
				open={confirmDelete}
				onClose={() => dispatch({ type: "confirm_delete", value: false })}
			>
				<DialogTitle>{t("template.deleteConfirmTitle")}</DialogTitle>
				<DialogContent>
					<Typography>{t("template.deleteConfirmBody")}</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => dispatch({ type: "confirm_delete", value: false })}>
						{t("common.cancel")}
					</Button>
					<Button color="error" variant="contained" onClick={handleDelete}>
						{t("template.delete")}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
