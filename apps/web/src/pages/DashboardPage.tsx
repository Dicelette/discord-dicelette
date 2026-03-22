import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CharactersTab from "../components/CharactersTab";
import GuildConfigForm from "../components/GuildConfigForm";
import UserConfigForm from "../components/UserConfigForm";
import { useI18n } from "../i18n";
import type { ApiGuildConfig, ApiUserConfig } from "../lib/api";
import { guildApi, userApi } from "../lib/api";

export default function DashboardPage() {
	const { guildId } = useParams<{ guildId: string }>();
	const navigate = useNavigate();
	const { t } = useI18n();

	const [tab, setTab] = useState<"admin" | "user" | "characters">("admin");
	const [isAdmin, setIsAdmin] = useState(false);
	const [config, setConfig] = useState<ApiGuildConfig | null>(null);
	const [userConfigData, setUserConfigData] = useState<ApiUserConfig["userConfig"]>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);

	useEffect(() => {
		if (!guildId) return;
		userApi
			.getUserConfig(guildId)
			.then(async (res) => {
				const { isAdmin: admin, userConfig } = res.data;
				setIsAdmin(admin);
				setUserConfigData(userConfig);
				setTab(admin ? "admin" : "characters");
				if (admin) {
					const configRes = await guildApi.getConfig(guildId);
					setConfig(configRes.data);
				}
			})
			.catch(() => setError(t("dashboard.loadError")))
			.finally(() => setLoading(false));
	}, [guildId, t]);

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
			setError(t("dashboard.saveError"));
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
			<Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/")} sx={{ mb: 3 }}>
				{t("common.back")}
			</Button>

			<Typography variant="h4" gutterBottom fontWeight={700}>
				{t("dashboard.title")}
			</Typography>

			{error && (
				<Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			{saveSuccess && (
				<Alert severity="success" sx={{ mb: 3 }}>
					{t("dashboard.saveSuccess")}
				</Alert>
			)}

			<Tabs
				value={tab}
				onChange={(_, v) => setTab(v)}
				sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
			>
				{isAdmin && <Tab value="admin" label={t("dashboard.tabs.admin")} />}
				<Tab value="characters" label={t("dashboard.tabs.characters")} />
				<Tab value="user" label={t("dashboard.tabs.user")} />
			</Tabs>

			{tab === "admin" && isAdmin && config && (
				<GuildConfigForm
					config={config}
					guildId={guildId!}
					onSave={handleSave}
					saving={saving}
				/>
			)}

			{tab === "characters" && <CharactersTab guildId={guildId!} />}

			{tab === "user" && (
				<UserConfigForm guildId={guildId!} initialConfig={userConfigData} />
			)}
		</Box>
	);
}
