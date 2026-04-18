import { charactersApi } from "@dicelette/api";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
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

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			setCsvText(text);
		};
		reader.readAsText(file);
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
				setOpen(false);
				setCsvText("");
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
				startIcon={<CloudUploadIcon />}
				onClick={() => setOpen(true)}
			>
				{t("characters.import")}
			</Button>

			<Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
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
								<Typography variant="subtitle2">{t("characters.csvFile")}</Typography>
								<input
									type="file"
									accept=".csv"
									onChange={handleFileUpload}
									disabled={loading}
								/>
							</Box>

							<Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
								<Typography variant="caption">
									<strong>CSV Format:</strong> user;charName;avatar;channel;[stats];dice
									<br />
									<strong>Note:</strong> user can be user ID, username, or Discord tag
								</Typography>
							</Box>

							<FormControlLabel
								control={
									<Checkbox
										checked={deleteOldMessage}
										onChange={(e) => setDeleteOldMessage(e.target.checked)}
										disabled={loading}
									/>
								}
								label={
									<Box>
										<Typography variant="body2">
											{t("characters.deleteOldMessage")}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{t("characters.deleteOldMessageHelp")}
										</Typography>
									</Box>
								}
							/>

							{loading && <LinearProgress />}
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)} disabled={loading}>
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
