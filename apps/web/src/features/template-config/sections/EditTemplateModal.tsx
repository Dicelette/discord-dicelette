import type { StatisticalTemplate } from "@dicelette/core";
import DownloadIcon from "@mui/icons-material/Download";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Paper,
	Stack,
	Switch,
	Tab,
	Tabs,
	Typography,
} from "@mui/material";
import { type Channel, ChannelSelect } from "@shared";

import TemplateForm from "../../edit-template/TemplateForm";
import type { ImportTemplateData } from "../types";
import { useEditTemplateModal } from "./useEditTemplateModal";

// ─── sx constants ───────────────────────────────────────────────────────────────

const tabsSx = {
	position: "sticky",
	top: 0,
	zIndex: 10,
	bgcolor: "background.paper",
	borderBottom: 1,
	borderColor: "divider",
	px: 3,
	pt: 1,
} as const;
const hiddenSx = { display: "none" } as const;
const visibleSx = {} as const;
const captionIndentSx = { mt: 0.5, pl: 0.5 } as const;
const loadingBoxSx = { display: "flex", justifyContent: "center", py: 8 } as const;
const filePaperSx = {
	p: 1.5,
	bgcolor: "action.hover",
	borderColor: "divider",
} as const;
const channelsTabStackSx = { mt: 1 } as const;
const fileRowSx = {
	display: "flex",
	alignItems: "center",
	gap: 1,
	flexWrap: "wrap",
} as const;
const subtitleBoldSx = { fontWeight: 700 } as const;
const loadingOverlaySx = {
	position: "absolute",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	bgcolor: "rgba(0, 0, 0, 0.3)",
	zIndex: 1000,
} as const;

// ─── component ──────────────────────────────────────────────────────────────────

interface Props {
	open: boolean;
	onClose: () => void;
	onSave: (data: ImportTemplateData) => Promise<void>;
	channels: Channel[];
	hasCharacters: boolean;
	onExportTemplate?: () => void;
	/** If provided, pre-populates the form (edit mode). */
	existingTemplate?: StatisticalTemplate;
	defaultTemplateChannelId?: string;
	defaultPublicChannelId?: string;
	defaultPrivateChannelId?: string;
}

export default function EditTemplateModal({ hasCharacters, channels, ...props }: Props) {
	const {
		t,
		fullScreen,
		formId,
		activeTab,
		setActiveTab,
		importFile,
		importError,
		setImportError,
		importFileRef,
		handleImportFile,
		activeTemplate,
		formReady,
		state,
		dispatch,
		templateChannels,
		charChannels,
		handleClose,
		handleSave,
		isEditMode,
	} = useEditTemplateModal({ channels, ...props });

	return (
		<Dialog
			open={props.open}
			onClose={handleClose}
			fullScreen={fullScreen}
			maxWidth="lg"
			fullWidth
			scroll="paper"
			slotProps={{ paper: { sx: { height: fullScreen ? undefined : "80vh" } } }}
		>
			<DialogTitle>
				{isEditMode ? t("template.editModalTitle") : t("template.createModalTitle")}
			</DialogTitle>
			<DialogContent
				dividers
				sx={{ bgcolor: "background.paper", p: 0, position: "relative" }}
			>
				{state.saving && (
					<Box sx={loadingOverlaySx}>
						<CircularProgress />
					</Box>
				)}
				{/* Hidden file input — triggered by the button in the channels tab */}
				<input
					ref={importFileRef}
					type="file"
					accept=".json,application/json"
					style={{ display: "none" }}
					onChange={handleImportFile}
				/>

				{/* Sticky tabs bar */}
				<Box sx={tabsSx}>
					{state.error && (
						<Alert
							severity="error"
							onClose={() => dispatch({ type: "set_error", value: null })}
							sx={{ mb: 1 }}
						>
							{state.error}
						</Alert>
					)}
					<Tabs
						value={activeTab}
						onChange={(_, v) => setActiveTab(v)}
						variant="scrollable"
						scrollButtons="auto"
						allowScrollButtonsMobile
					>
						<Tab value="channels" label={t("config.sections.channels")} />
						<Tab value="general" label={t("template.general")} />
						<Tab value="statistics" label={t("template.statistics")} />
						<Tab value="macros" label={t("template.macros")} />
						<Tab value="customCritical" label={t("template.customCritical")} />
					</Tabs>
				</Box>

				{/* Scrollable content */}
				<Stack spacing={2} sx={{ px: 3, pb: 2 }}>
					{/* Channels tab */}
					<Box sx={activeTab === "channels" ? visibleSx : hiddenSx}>
						<Stack spacing={2} sx={channelsTabStackSx}>
							<Paper variant="outlined" sx={filePaperSx}>
								<Stack spacing={0.75}>
									<Typography variant="subtitle2" sx={subtitleBoldSx}>
										{t("template.importModalTitle")}
									</Typography>
									<Box sx={fileRowSx}>
										<Button
											variant="outlined"
											startIcon={<DownloadIcon />}
											onClick={() => importFileRef.current?.click()}
											size="small"
										>
											{t("template.fileLabel")}
										</Button>
										<Typography
											variant="body2"
											color={importFile ? "text.primary" : "text.secondary"}
										>
											{importFile ? importFile.name : t("template.fileNotSelected")}
										</Typography>
									</Box>
									{importError && (
										<Alert severity="error" onClose={() => setImportError(null)}>
											{importError}
										</Alert>
									)}
								</Stack>
							</Paper>

							<Stack spacing={1.5}>
								<Box>
									<ChannelSelect
										label={`${t("template.templateChannel")} *`}
										value={state.channelId || undefined}
										channels={templateChannels}
										allChannels={channels}
										onChange={(value) => {
											dispatch({ type: "set_channel", key: "channelId", value });
											dispatch({ type: "set_error", value: null });
										}}
									/>
									<Typography
										variant="caption"
										sx={[
											{
												color: "text.secondary",
											},
											...(Array.isArray(captionIndentSx)
												? captionIndentSx
												: [captionIndentSx]),
										]}
									>
										{t("template.templateChannelHelp")}
									</Typography>
								</Box>

								<Box>
									<ChannelSelect
										label={t("config.defaultSheet")}
										value={state.publicChannelId || undefined}
										channels={charChannels}
										allChannels={channels}
										onChange={(value) =>
											dispatch({ type: "set_channel", key: "publicChannelId", value })
										}
									/>
									<Typography
										variant="caption"
										sx={[
											{
												color: "text.secondary",
											},
											...(Array.isArray(captionIndentSx)
												? captionIndentSx
												: [captionIndentSx]),
										]}
									>
										{t("template.publicChannelHelp")}
									</Typography>
								</Box>

								<Box>
									<ChannelSelect
										label={t("config.fields.privateChannel")}
										value={state.privateChannelId || undefined}
										channels={charChannels}
										allChannels={channels}
										onChange={(value) =>
											dispatch({ type: "set_channel", key: "privateChannelId", value })
										}
									/>
									<Typography
										variant="caption"
										sx={[
											{
												color: "text.secondary",
											},
											...(Array.isArray(captionIndentSx)
												? captionIndentSx
												: [captionIndentSx]),
										]}
									>
										{t("template.privateChannelHelp")}
									</Typography>
								</Box>
							</Stack>

							{hasCharacters && (
								<Stack spacing={2}>
									<Stack spacing={1}>
										<Alert severity="info">{t("template.updateWarning")}</Alert>
										<FormControlLabel
											control={
												<Switch
													checked={state.updateCharacters}
													onChange={(e) =>
														dispatch({
															type: "set_update_characters",
															value: e.target.checked,
														})
													}
												/>
											}
											label={
												<Box>
													<Typography variant="body2">
														{t("template.updateCharacters")}
													</Typography>
													<Typography
														variant="caption"
														sx={{
															color: "text.secondary",
														}}
													>
														{t("template.updateCharactersHelp")}
													</Typography>
												</Box>
											}
										/>
									</Stack>
									<Stack spacing={1}>
										<Alert severity="warning">{t("template.deleteWarning")}</Alert>
										<FormControlLabel
											control={
												<Switch
													checked={state.deleteCharacters}
													color="error"
													onChange={(e) =>
														dispatch({
															type: "set_delete_characters",
															value: e.target.checked,
														})
													}
												/>
											}
											label={
												<Box>
													<Typography
														variant="body2"
														color={state.deleteCharacters ? "error" : undefined}
													>
														{t("template.deleteCharacters")}
													</Typography>
													<Typography
														variant="caption"
														sx={{
															color: "text.secondary",
														}}
													>
														{t("template.deleteCharactersHelp")}
													</Typography>
												</Box>
											}
										/>
									</Stack>
								</Stack>
							)}
						</Stack>
					</Box>

					{/* Template form — deferred mount so the dialog animation plays first */}
					{formReady ? (
						<TemplateForm
							activeTab={activeTab}
							initialTemplate={activeTemplate}
							onSave={handleSave}
							onError={(msg) => dispatch({ type: "set_error", value: msg })}
							formId={formId}
						/>
					) : (
						activeTab !== "channels" && (
							<Box sx={loadingBoxSx}>
								<CircularProgress />
							</Box>
						)
					)}
				</Stack>
			</DialogContent>
			<DialogActions
				sx={{
					bgcolor: "background.paper",
					display: "flex",
					justifyContent: "space-between",
				}}
			>
				{props.onExportTemplate && isEditMode ? (
					<Button
						variant="outlined"
						startIcon={<FileDownloadIcon />}
						onClick={props.onExportTemplate}
						size="small"
					>
						{t("export.name").toTitle()}
					</Button>
				) : (
					<Box />
				)}
				<Box sx={{ display: "flex", gap: 1 }}>
					<Button onClick={handleClose} disabled={state.saving}>
						{t("common.cancel")}
					</Button>
					<Button
						type="submit"
						form={formId}
						variant="contained"
						disabled={state.saving || !state.channelId || !formReady}
					>
						{state.saving ? t("common.saving") : t("common.save")}
					</Button>
				</Box>
			</DialogActions>
		</Dialog>
	);
}
