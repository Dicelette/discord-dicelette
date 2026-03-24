import {
	getEngine,
	type StatisticalTemplate,
	verifyTemplateValue,
} from "@dicelette/core";
import DownloadIcon from "@mui/icons-material/Download";
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControlLabel,
	Paper,
	Stack,
	Switch,
	Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { ChannelSelect } from "./atoms";
import type { Channel } from "./types";

export interface ImportTemplateData {
	template: StatisticalTemplate;
	channelId: string;
	publicChannelId?: string;
	privateChannelId?: string;
	deleteCharacters: boolean;
}

interface Props {
	open: boolean;
	onClose: () => void;
	onImport: (data: ImportTemplateData) => Promise<void>;
	channels: Channel[];
	hasCharacters: boolean;
	defaultTemplateChannelId?: string;
	defaultPublicChannelId?: string;
	defaultPrivateChannelId?: string;
}

export default function ImportTemplateModal({
	open,
	onClose,
	onImport,
	channels,
	hasCharacters,
	defaultTemplateChannelId,
	defaultPublicChannelId,
	defaultPrivateChannelId,
}: Props) {
	const { t } = useI18n();
	const fileRef = useRef<HTMLInputElement>(null);

	const [file, setFile] = useState<File | null>(null);
	const [channelId, setChannelId] = useState(defaultTemplateChannelId ?? "");
	const [publicChannelId, setPublicChannelId] = useState(defaultPublicChannelId ?? "");
	const [privateChannelId, setPrivateChannelId] = useState(defaultPrivateChannelId ?? "");
	const [deleteCharacters, setDeleteCharacters] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	// Synchronise les valeurs par défaut si la config change
	useEffect(() => {
		setChannelId(defaultTemplateChannelId ?? "");
	}, [defaultTemplateChannelId]);

	useEffect(() => {
		setPublicChannelId(defaultPublicChannelId ?? "");
	}, [defaultPublicChannelId]);

	useEffect(() => {
		setPrivateChannelId(defaultPrivateChannelId ?? "");
	}, [defaultPrivateChannelId]);

	// Canal template : texte uniquement (type 0)
	const templateChannels = channels.filter((c) => c.type === 0);
	// Canaux personnages : texte + forum (type 0 ou 15)
	const charChannels = channels.filter((c) => c.type === 0 || c.type === 15);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFile(e.target.files?.[0] ?? null);
		setError(null);
		e.target.value = "";
	};

	const handleSubmit = async () => {
		if (!file) {
			setError(t("template.fileRequired"));
			return;
		}
		if (!channelId) {
			setError(t("template.channelRequired"));
			return;
		}
		let validated: StatisticalTemplate;
		try {
			const json = JSON.parse(await file.text());
			const engine = getEngine("browserCrypto");
			validated = verifyTemplateValue(json, true, engine);
		} catch {
			setError(t("template.importError"));
			return;
		}
		setSaving(true);
		try {
			await onImport({
				template: validated,
				channelId,
				publicChannelId,
				privateChannelId,
				deleteCharacters,
			});
			handleClose();
		} catch {
			setError(t("template.importError"));
		} finally {
			setSaving(false);
		}
	};

	const handleClose = () => {
		setFile(null);
		setChannelId(defaultTemplateChannelId ?? "");
		setPublicChannelId(defaultPublicChannelId ?? "");
		setPrivateChannelId(defaultPrivateChannelId ?? "");
		setDeleteCharacters(false);
		setError(null);
		onClose();
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>{t("template.importModalTitle")}</DialogTitle>

			<DialogContent sx={{ bgcolor: "background.paper" }}>
				<Stack spacing={2} sx={{ mt: 1 }}>
					{error && <Alert severity="error">{error}</Alert>}

					{/* Sélection du fichier */}
					<input
						ref={fileRef}
						type="file"
						accept=".json,application/json"
						style={{ display: "none" }}
						onChange={handleFileChange}
					/>
					<Paper
						variant="outlined"
						sx={{ p: 1.5, bgcolor: "action.hover", borderColor: "divider" }}
					>
						<Stack spacing={0.75}>
							<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
								{t("template.fileLabel")}
							</Typography>
							<Box
								sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
							>
								<Button
									variant="outlined"
									startIcon={<DownloadIcon />}
									onClick={() => fileRef.current?.click()}
									size="small"
								>
									{t("template.fileLabel")}
								</Button>
								<Typography
									variant="body2"
									color={file ? "text.primary" : "text.secondary"}
								>
									{file ? file.name : t("template.fileNotSelected")}
								</Typography>
							</Box>
						</Stack>
					</Paper>

					<Stack spacing={1.5}>
						{/* Canal de la template (obligatoire) */}
						<Box>
							<ChannelSelect
								label={`${t("template.templateChannel")} *`}
								value={channelId || undefined}
								channels={templateChannels}
								onChange={(value) => {
									setChannelId(value);
									setError(null);
								}}
							/>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{ mt: 0.5, pl: 0.5 }}
							>
								{t("template.templateChannelHelp")}
							</Typography>
						</Box>

						{/* Canal public (optionnel) */}
						<Box>
							<ChannelSelect
								label={t("config.defaultSheet")}
								value={publicChannelId || undefined}
								channels={charChannels}
								onChange={setPublicChannelId}
							/>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{ mt: 0.5, pl: 0.5 }}
							>
								{t("template.publicChannelHelp")}
							</Typography>
						</Box>

						{/* Canal privé (optionnel) */}
						<Box>
							<ChannelSelect
								label={t("config.fields.privateChannel")}
								value={privateChannelId || undefined}
								channels={charChannels}
								onChange={setPrivateChannelId}
							/>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{ mt: 0.5, pl: 0.5 }}
							>
								{t("template.privateChannelHelp")}
							</Typography>
						</Box>
					</Stack>

					{/* Suppression des personnages — visible seulement s'il y en a */}
					{hasCharacters && (
						<>
							<Divider />

							<Alert severity="warning">{t("template.deleteWarning")}</Alert>

							<FormControlLabel
								control={
									<Switch
										checked={deleteCharacters}
										color="error"
										onChange={(e) => setDeleteCharacters(e.target.checked)}
									/>
								}
								label={
									<Box>
										<Typography
											variant="body2"
											color={deleteCharacters ? "error" : undefined}
										>
											{t("template.deleteCharacters")}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{t("template.deleteCharactersHelp")}
										</Typography>
									</Box>
								}
							/>
						</>
					)}
				</Stack>
			</DialogContent>

			<DialogActions sx={{ bgcolor: "background.paper" }}>
				<Button onClick={handleClose}>{t("common.cancel")}</Button>
				<Button
					variant="contained"
					onClick={handleSubmit}
					disabled={saving || !file || !channelId}
					startIcon={<DownloadIcon />}
				>
					{saving ? t("common.saving") : t("import.name").toTitle()}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
