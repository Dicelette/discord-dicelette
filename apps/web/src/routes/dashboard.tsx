import {
	type ApiUserConfig,
	charactersApi,
	guildApi,
	userApi,
} from "@dicelette/dashboard-api";
import type { ApiGuildData } from "@dicelette/types";
import { keyframes } from "@emotion/react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";

const spinAnimation = keyframes`
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
`;

import {
	Alert,
	Box,
	Button,
	CircularProgress,
	IconButton,
	Tab,
	Tabs,
	Tooltip,
	Typography,
} from "@mui/material";
import { type Channel, type Role, useI18n } from "@shared";
import { lazy, Suspense, startTransition, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	CharactersTab,
	GuildConfigForm,
	ServerCharactersTab,
	UserConfigForm,
} from "../features";

const ModelConfigForm = lazy(() => import("../features/template-config/ModelConfigForm"));

type ActiveTab = "admin" | "template" | "user" | "characters" | "server-characters";

export default function Dashboard() {
	const { guildId } = useParams<{ guildId: string }>();
	const navigate = useNavigate();
	const { t } = useI18n();

	const [tab, setTab] = useState<ActiveTab>("admin");
	const [mountedTabs, setMountedTabs] = useState<Set<ActiveTab>>(
		() => new Set(["admin"])
	);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isStrictAdmin, setIsStrictAdmin] = useState(false);
	const [userCharCount, setUserCharCount] = useState(0);
	const [serverCharCount, setServerCharCount] = useState(0);
	const [config, setConfig] = useState<ApiGuildData | null>(null);
	const [userConfigData, setUserConfigData] = useState<ApiUserConfig["userConfig"]>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [refreshingCharacters, setRefreshingCharacters] = useState(false);
	const [refreshSuccess, setRefreshSuccess] = useState(false);
	const [charactersRefreshToken, setCharactersRefreshToken] = useState(0);
	const [channels, setChannels] = useState<Channel[]>([]);
	const [roles, setRoles] = useState<Role[]>([]);

	useEffect(() => {
		if (!guildId) return;
		Promise.all([
			userApi.getUserConfig(guildId),
			charactersApi.countSelf(guildId).catch(() => null),
		])
			.then(async ([userConfigRes, userCountRes]) => {
				const { isAdmin: admin, isStrictAdmin: strictAdmin, userConfig } =
					userConfigRes.data;
				const nextUserCharCount = userCountRes?.data.count ?? 0;
				const hasUserCharacters = nextUserCharCount > 0;
				setUserCharCount(nextUserCharCount);
				setIsAdmin(admin);
				setIsStrictAdmin(strictAdmin);
				setUserConfigData(userConfig);
				const initialTab = admin ? "admin" : hasUserCharacters ? "characters" : "user";
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
						charactersApi
							.count(guildId)
							.then((r) => setServerCharCount(r.data.count))
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

	const handleCharactersRefresh = async () => {
		if (!guildId) return;
		setRefreshingCharacters(true);
		setError(null);
		setRefreshSuccess(false);
		try {
			await charactersApi.refreshDashboard(guildId);
			setCharactersRefreshToken((prev) => prev + 1);
			setRefreshSuccess(true);
			setTimeout(() => setRefreshSuccess(false), 3000);
		} catch {
			setError(t("dashboard.refreshCharactersError"));
		} finally {
			setRefreshingCharacters(false);
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

			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 2,
					mb: 1,
				}}
			>
				<Typography variant="h4" gutterBottom fontWeight={700} sx={{ mb: 0 }}>
					{t("dashboard.title")}
				</Typography>
				<Tooltip title={t("dashboard.refreshCharactersTooltip")}>
					<Box component="span">
						<IconButton
							onClick={handleCharactersRefresh}
							disabled={refreshingCharacters}
							size="small"
							aria-label={t("dashboard.refreshCharacters")}
						>
							<RefreshIcon
								sx={{
									animation: refreshingCharacters
										? `${spinAnimation} 1.4s linear infinite`
										: "none",
								}}
							/>
						</IconButton>
					</Box>
				</Tooltip>
			</Box>

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
			{refreshSuccess && (
				<Alert severity="success" sx={{ mb: 3 }} onClose={() => setRefreshSuccess(false)}>
					{t("dashboard.refreshCharactersSuccess")}
				</Alert>
			)}

			<Tabs
				value={tab}
				variant="scrollable"
				scrollButtons="auto"
				onChange={(_, v: ActiveTab) => {
					setMountedTabs((prev) => (prev.has(v) ? prev : new Set([...prev, v])));
					startTransition(() => setTab(v));
				}}
				slotProps={{
					indicator: {
						sx: { display: { xs: "none", sm: "block" } },
					},
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
				{isAdmin && serverCharCount > 0 && (
					<Tab
						value="server-characters"
						label={t("dashboard.tabs.serverCharacters")}
						wrapped
					/>
				)}
				<Tab value="user" label={t("dashboard.tabs.user")} wrapped />
				{userCharCount > 0 && (
					<Tab value="characters" label={t("dashboard.tabs.characters")} wrapped />
				)}
			</Tabs>

			{isAdmin && config && mountedTabs.has("admin") && (
				<Box sx={{ display: tab === "admin" ? undefined : "none" }}>
					<GuildConfigForm
						config={config}
						guildId={guildId!}
						onSave={handleSave}
						saving={saving}
						channels={channels}
						roles={roles}
						isStrictAdmin={isStrictAdmin}
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
			{userCharCount > 0 && mountedTabs.has("characters") && (
				<Box sx={{ display: tab === "characters" ? undefined : "none" }}>
					<CharactersTab guildId={guildId!} refreshToken={charactersRefreshToken} />
				</Box>
			)}
			{isAdmin && mountedTabs.has("server-characters") && (
				<Box sx={{ display: tab === "server-characters" ? undefined : "none" }}>
					<ServerCharactersTab guildId={guildId!} refreshToken={charactersRefreshToken} />
				</Box>
			)}
		</Box>
	);
}
