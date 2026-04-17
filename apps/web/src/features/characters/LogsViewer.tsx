import DeleteIcon from "@mui/icons-material/Delete";
import HistoryIcon from "@mui/icons-material/History";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { useCallback, useState } from "react";

interface CharacterLog {
	id: string;
	timestamp: number;
	action: "import" | "edit" | "delete";
	userId: string;
	userName?: string;
	charName: string | null;
	messageId: string;
	details?: Record<string, string | number | boolean | undefined>;
}

interface LogsViewerProps {
	guildId: string;
}

export default function LogsViewer({ guildId }: LogsViewerProps) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	const [logs, setLogs] = useState<CharacterLog[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadLogs = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/guilds/${guildId}/logs`, {
				credentials: "include",
			});

			if (!response.ok) throw new Error("Failed to load logs");

			const data = await response.json();
			setLogs(data.logs || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load logs");
		} finally {
			setLoading(false);
		}
	}, [guildId]);

	const handleClearLogs = async () => {
		if (!confirm("Are you sure you want to clear all logs?")) return;

		try {
			const response = await fetch(`/api/guilds/${guildId}/logs`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) throw new Error("Failed to clear logs");

			setLogs([]);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to clear logs");
		}
	};

	const handleOpen = () => {
		setOpen(true);
		loadLogs();
	};

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleString();
	};

	const actionLabel = (action: string) => {
		const labels: Record<string, string> = {
			import: t("characters.import"),
			edit: t("common.edit"),
			delete: t("common.delete"),
		};
		return labels[action] || action;
	};

	return (
		<>
			<Button
				variant="outlined"
				size="small"
				startIcon={<HistoryIcon />}
				onClick={handleOpen}
			>
				{t("characters.logs")}
			</Button>

			<Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<Typography variant="h6">{t("characters.logsTitle")}</Typography>
						<Button
							size="small"
							variant="outlined"
							color="error"
							startIcon={<DeleteIcon />}
							onClick={handleClearLogs}
							disabled={loading || logs.length === 0}
						>
							{t("common.clear")}
						</Button>
					</Box>
				</DialogTitle>
				<DialogContent>
					{error && <Alert severity="error">{error}</Alert>}

					{loading ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
							<CircularProgress />
						</Box>
					) : logs.length === 0 ? (
						<Typography color="textSecondary">{t("characters.noLogs")}</Typography>
					) : (
						<TableContainer component={Paper}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>{t("common.date")}</TableCell>
										<TableCell>{t("common.action")}</TableCell>
										<TableCell>{t("common.user")}</TableCell>
										<TableCell>{t("characters.name")}</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{logs.map((log) => (
										<TableRow key={log.id}>
											<TableCell>{formatDate(log.timestamp)}</TableCell>
											<TableCell>{actionLabel(log.action)}</TableCell>
											<TableCell>{log.userName || log.userId}</TableCell>
											<TableCell>{log.charName || "—"}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>{t("common.close")}</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
