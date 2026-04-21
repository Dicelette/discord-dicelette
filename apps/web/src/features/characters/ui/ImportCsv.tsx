import { charactersApi } from "@dicelette/api";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	LinearProgress,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { useState } from "react";

interface Props {
	guildId: string;
	onSuccess: () => void;
}

export default function ImportCsv({ guildId, onSuccess }: Props) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	const [csvText, setCsvText] = useState("");
	const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
	const [deleteOldMessage, setDeleteOldMessage] = useState(false);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{
		success: number;
		failed: number;
		errors: string[];
	} | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		setSelectedFileName(file.name);

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			setCsvText(text);
		};
		reader.readAsText(file);
		// Allow selecting the same file again and still trigger onChange.
		event.target.value = "";
	};

	const handleCloseDialog = () => {
		setOpen(false);
		setSelectedFileName(null);
		setCsvText("");
		setError(null);
		setResult(null);
	};

	const handleImport = async () => {
		if (!csvText) {
			setError(t("characters.importError") || "Please provide CSV content");
			return;
		}

		setLoading(true);
		setError(null);
		setResult(null);

		try {
			const response = await charactersApi.importCharacters(guildId, {
				csvText,
				deleteOldMessage,
			});
			const result = response.data || response;
			setResult(result);
			if (result.failed === 0) {
				onSuccess();
				handleCloseDialog();
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Import failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Button
				variant="contained"
				startIcon={<DownloadIcon />}
				onClick={() => setOpen(true)}
			>
				{t("characters.import")}
			</Button>
			<Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
				<DialogTitle>{t("characters.importTitle")}</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
					{error && <Alert severity="error">{error}</Alert>}

					{result ? (
						<Box>
							<Typography variant="h6">
								{t("characters.importResult", {
									success: result.success,
									failed: result.failed,
								})}
							</Typography>
							{result.errors.length > 0 && (
								<Box sx={{ mt: 2 }}>
									<Typography variant="subtitle2">Errors:</Typography>
									<ul>
										{result.errors.map((err) => (
											<li key={err}>{err}</li>
										))}
									</ul>
								</Box>
							)}
						</Box>
					) : (
						<>
							<Box>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										columnGap: 1,
										rowGap: 0.5,
										flexWrap: "wrap",
									}}
								>
									<Button
										variant="outlined"
										component="label"
										startIcon={<UploadFileIcon />}
										disabled={loading}
									>
										{t("characters.csvFile")}
										<input
											hidden
											type="file"
											accept=".csv"
											onChange={handleFileUpload}
											disabled={loading}
										/>
									</Button>
									<Typography
										variant="body2"
										color={selectedFileName ? "text.primary" : "text.secondary"}
										sx={{ lineHeight: 1.4 }}
									>
										{selectedFileName || t("template.fileNotSelected")}
									</Typography>
								</Box>
							</Box>
							<FormControlLabel
								sx={{ alignItems: "flex-start", ml: 0, mt: 0.5 }}
								control={
									<Checkbox
										checked={deleteOldMessage}
										onChange={(e) => setDeleteOldMessage(e.target.checked)}
										disabled={loading}
									/>
								}
								label={
									<Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
										<Typography variant="body2">
											{t("characters.deleteOldMessage")}
										</Typography>
										<Typography
											variant="caption"
											sx={{
												color: "text.secondary",
											}}
										>
											{t("characters.deleteOldMessageHelp")}
										</Typography>
									</Box>
								}
							/>
							<Alert severity="info">
								<Typography variant="caption" gutterBottom>
									{t("characters.format")}
									{t("common.space")}:{" "}
									<code>user;charName;avatar;channel;[stats];dice</code>
								</Typography>
							</Alert>
							{loading && <LinearProgress />}
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDialog} disabled={loading}>
						{result ? t("common.close") : t("common.cancel")}
					</Button>
					{!result && (
						<Button
							onClick={handleImport}
							variant="contained"
							disabled={loading || !csvText}
						>
							{loading ? <CircularProgress size={24} /> : t("characters.import")}
						</Button>
					)}
				</DialogActions>
			</Dialog>
		</>
	);
}
