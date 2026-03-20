import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import type { ApiGuildConfig } from "../lib/api";
import { guildApi } from "../lib/api";
import GuildConfigForm from "../components/GuildConfigForm";

export default function DashboardPage() {
	const { guildId } = useParams<{ guildId: string }>();
	const navigate = useNavigate();
	const [config, setConfig] = useState<ApiGuildConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);

	useEffect(() => {
		if (!guildId) return;
		guildApi
			.getConfig(guildId)
			.then((res) => setConfig(res.data))
			.catch(() => setError("Impossible de charger la configuration."))
			.finally(() => setLoading(false));
	}, [guildId]);

	const handleSave = async (updates: Partial<ApiGuildConfig>) => {
		if (!guildId) return;
		setSaving(true);
		setSaveSuccess(false);
		try {
			await guildApi.updateConfig(guildId, updates);
			setConfig((prev) => (prev ? { ...prev, ...updates } : prev));
			setSaveSuccess(true);
			setTimeout(() => setSaveSuccess(false), 3000);
		} catch {
			setError("Erreur lors de la sauvegarde.");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<Box className="flex items-center justify-center p-16">
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box className="max-w-4xl mx-auto p-6">
			<Button
				startIcon={<ArrowBackIcon />}
				onClick={() => navigate("/")}
				sx={{ mb: 3 }}
			>
				Retour aux serveurs
			</Button>

			<Typography variant="h4" gutterBottom fontWeight={700}>
				Configuration du serveur
			</Typography>

			{error && (
				<Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			{saveSuccess && (
				<Alert severity="success" sx={{ mb: 3 }}>
					Configuration sauvegardée !
				</Alert>
			)}

			{config && (
				<GuildConfigForm
					config={config}
					guildId={guildId!}
					onSave={handleSave}
					saving={saving}
				/>
			)}
		</Box>
	);
}
