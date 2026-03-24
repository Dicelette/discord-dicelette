import { type StatisticalTemplate, verifyTemplateValue } from "@dicelette/core";
import UploadIcon from "@mui/icons-material/Upload";
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
	Stack,
	Switch,
	Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import { useI18n } from "../../../i18n";
import ChannelSelect from "../ChannelSelect";
import type { Channel } from "../types";

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
}

export default function ImportTemplateModal({
	open,
	onClose,
	onImport,
	channels,
	hasCharacters,
}: Props) {
	const { t } = useI18n();
	const fileRef = useRef<HTMLInputElement>(null);

	const [file, setFile] = useState<File | null>(null);
	const [channelId, setChannelId] = useState("");
	const [publicChannelId, setPublicChannelId] = useState("");
	const [privateChannelId, setPrivateChannelId] = useState("");
	const [deleteCharacters, setDeleteCharacters] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

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
		try {
			const json = JSON.parse(await file.text());
			const validated = verifyTemplateValue(json);
			setSaving(true);
			await onImport({
				template: validated,
				channelId,
				publicChannelId: publicChannelId || undefined,
				privateChannelId: privateChannelId || undefined,
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
		setChannelId("");
		setPublicChannelId("");
		setPrivateChannelId("");
		setDeleteCharacters(false);
		setError(null);
		onClose();
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>{t("template.importModalTitle")}</DialogTitle>

			<DialogContent>
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
					<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
						<Button
							variant="outlined"
							startIcon={<UploadIcon />}
							onClick={() => fileRef.current?.click()}
							size="small"
						>
							{t("template.fileLabel")}
						</Button>
						<Typography variant="body2" color={file ? "text.primary" : "text.secondary"}>
							{file ? file.name : t("template.fileNotSelected")}
						</Typography>
					</Box>

					<Divider />

					{/* Canal de la template (obligatoire) */}
					<ChannelSelect
						label={`${t("template.templateChannel")} *`}
						value={channelId || undefined}
						channels={templateChannels}
						helperText={t("template.templateChannelHelp")}
						onChange={setChannelId}
					/>

					{/* Canal public (optionnel) */}
					<ChannelSelect
						label={t("template.publicChannel")}
						value={publicChannelId || undefined}
						channels={charChannels}
						helperText={t("template.publicChannelHelp")}
						onChange={setPublicChannelId}
					/>

					{/* Canal privé (optionnel) */}
					<ChannelSelect
						label={t("config.fields.privateChannel")}
						value={privateChannelId || undefined}
						channels={charChannels}
						helperText={t("template.privateChannelHelp")}
						onChange={setPrivateChannelId}
					/>

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

			<DialogActions>
				<Button onClick={handleClose}>{t("common.cancel")}</Button>
				<Button
					variant="contained"
					onClick={handleSubmit}
					disabled={saving}
					startIcon={<UploadIcon />}
				>
					{saving ? t("common.saving") : t("template.import")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
