import type { ApiGuildData } from "@dicelette/types";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Tab,
	Tabs,
	Typography,
} from "@mui/material";
import { lazy, Suspense, startTransition, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	type Channel,
	CharactersTab,
	GuildConfigForm,
	type Role,
	UserConfigForm,
} from "../features";
import { type ApiUserConfig, guildApi, useI18n, userApi } from "../shared";

const ModelConfigForm = lazy(() => import("../features/guild-config/ui/ModelConfigForm"));

type ActiveTab = "admin" | "template" | "user" | "characters";

export default function Dashboard() {
	const { guildId } = useParams<{ guildId: string }>();
	const navigate = useNavigate();
	const { t } = useI18n();

	const [tab, setTab] = useState<ActiveTab>("admin");
	const [mountedTabs, setMountedTabs] = useState<Set<ActiveTab>>(
		() => new Set(["admin"])
	);
	const [isAdmin, setIsAdmin] = useState(false);
	const [config, setConfig] = useState<ApiGuildData | null>(null);
	const [userConfigData, setUserConfigData] = useState<ApiUserConfig["userConfig"]>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [channels, setChannels] = useState<Channel[]>([]);
	const [roles, setRoles] = useState<Role[]>([]);

	useEffect(() => {
		if (!guildId) return;
		userApi
			.getUserConfig(guildId)
			.then(async (res) => {
				const { isAdmin: admin, userConfig } = res.data;
				setIsAdmin(admin);
				setUserConfigData(userConfig);
				const initialTab = admin ? "admin" : "characters";
				setTab(initialTab);
				setMountedTabs(new Set([initialTab]));
				if (admin) {
					const [configRes] = await Promise.all([
						guildApi.getConfig(guildId),
						guildApi
							.getChannels(guildId)
							.then((r) => setChannels(r.data))
							.catch(() => {}),
						guildApi
							.getRoles(guildId)
							.then((r) => setRoles(r.data))
							.catch(() => {}),
					]);
					setConfig(configRes.data);
				}
			})
			.catch(() => setError(t("dashboard.loadError")))
			.finally(() => setLoading(false));
	}, [guildId, t]);

	const handleSave = async (updates: Partial<ApiGuildData>) => {
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
		<Box sx={{ maxWidth: "56rem", mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
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
				onChange={(_, v: ActiveTab) => {
					setMountedTabs((prev) => (prev.has(v) ? prev : new Set([...prev, v])));
					startTransition(() => setTab(v));
				}}
				TabIndicatorProps={{
					sx: { display: { xs: "none", sm: "block" } },
				}}
				sx={{
					mb: 3,
					borderBottom: 1,
					borderColor: "divider",
					"& .MuiTabs-flexContainer": {
						flexWrap: { xs: "wrap", sm: "nowrap" },
						rowGap: 0.5,
					},
					"& .MuiTab-root": {
						minWidth: { xs: 0, sm: 90 },
						px: { xs: 1, sm: 2 },
						flex: { xs: "1 1 auto", sm: "0 0 auto" },
						borderBottom: { xs: "2px solid transparent", sm: "none" },
						mb: { xs: "-1px", sm: 0 },
						"&.Mui-selected": {
							borderBottomColor: { xs: "primary.main", sm: "transparent" },
						},
					},
				}}
			>
				{isAdmin && <Tab value="admin" label={t("dashboard.tabs.admin")} wrapped />}
				{isAdmin && <Tab value="template" label={t("dashboard.tabs.template")} wrapped />}
				<Tab value="user" label={t("dashboard.tabs.user")} wrapped />
				<Tab value="characters" label={t("dashboard.tabs.characters")} wrapped />
			</Tabs>

			{isAdmin && config && mountedTabs.has("admin") && (
				<Box sx={{ display: tab === "admin" ? undefined : "none" }}>
					<GuildConfigForm
						config={config}
						guildId={guildId!}
						onSave={handleSave}
						saving={saving}
						channels={channels}
					/>
				</Box>
			)}
			{isAdmin && config && mountedTabs.has("template") && (
				<Box sx={{ display: tab === "template" ? undefined : "none" }}>
					<Suspense fallback={<CircularProgress />}>
						<ModelConfigForm
							config={config}
							guildId={guildId!}
							onSave={handleSave}
							saving={saving}
							channels={channels}
							roles={roles}
						/>
					</Suspense>
				</Box>
			)}
			{mountedTabs.has("user") && (
				<Box sx={{ display: tab === "user" ? undefined : "none" }}>
					<UserConfigForm guildId={guildId!} initialConfig={userConfigData} />
				</Box>
			)}
			{mountedTabs.has("characters") && (
				<Box sx={{ display: tab === "characters" ? undefined : "none" }}>
					<CharactersTab guildId={guildId!} />
				</Box>
			)}
		</Box>
	);
}
