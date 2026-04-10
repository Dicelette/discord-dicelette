import { keyframes } from "@emotion/react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { ReactNode } from "react";

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
import { useI18n } from "@shared";
import { lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	CharactersTab,
	GuildConfigForm,
	ServerCharactersTab,
	UserConfigForm,
} from "../features";
import { type ActiveTab, useDashboard } from "./hooks/useDashboard";

const ModelConfigForm = lazy(() => import("../features/template-config/ModelConfigForm"));

const tabHiddenSx = { display: "none" } as const;
const tabVisibleSx = {} as const;
const pageContainerSx = {
	maxWidth: "56rem",
	mx: "auto",
	px: { xs: 2, sm: 3 },
	py: 3,
} as const;
const backButtonSx = { mb: 3 } as const;
const dashboardHeaderSx = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 2,
	mb: 1,
} as const;
const dashboardTitleSx = { mb: 0 } as const;
const spinSx = { animation: `${spinAnimation} 1.4s linear infinite` } as const;
const noSpinSx = { animation: "none" } as const;
const alertSx = { mb: 3 } as const;
const tabsSx = {
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
} as const;
const tabIndicatorSx = { display: { xs: "none", sm: "block" } } as const;
const tabsUnsavedSx = {
	"& .MuiTab-root:not(.Mui-selected)": {
		opacity: 0.4,
		transition: "opacity 0.2s ease",
		"& .MuiTouchRipple-root": { display: "none" },
	},
	"& .MuiTabScrollButton-root": {
		pointerEvents: "none",
		opacity: 0.2,
	},
} as const;

function TabPanel({
	value,
	current,
	mounted,
	children,
}: {
	value: ActiveTab;
	current: ActiveTab;
	mounted: Set<ActiveTab>;
	children: ReactNode;
}) {
	if (!mounted.has(value)) return null;
	return <Box sx={current === value ? tabVisibleSx : tabHiddenSx}>{children}</Box>;
}

export default function Dashboard() {
	const { guildId } = useParams<{ guildId: string }>();
	const navigate = useNavigate();
	const { t } = useI18n();

	const {
		tab,
		mountedTabs,
		isAdmin,
		isStrictAdmin,
		userCharCount,
		serverCharCount,
		config,
		userConfigData,
		loading,
		error,
		setError,
		saving,
		saveSuccess,
		refreshingCharacters,
		refreshSuccess,
		setRefreshSuccess,
		charactersRefreshToken,
		channels,
		roles,
		hasUnsavedChanges,
		setHasUnsavedChanges,
		handleSave,
		handleCharactersRefresh,
		handleTabChange,
	} = useDashboard(guildId);

	if (loading) {
		return (
			<Box className="flex items-center justify-center p-16">
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box sx={pageContainerSx}>
			<Button
				startIcon={<ArrowBackIcon />}
				onClick={() => navigate("/")}
				sx={backButtonSx}
			>
				{t("common.back")}
			</Button>

			<Box sx={dashboardHeaderSx}>
				<Typography variant="h4" gutterBottom fontWeight={700} sx={dashboardTitleSx}>
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
							<RefreshIcon sx={refreshingCharacters ? spinSx : noSpinSx} />
						</IconButton>
					</Box>
				</Tooltip>
			</Box>

			{error && (
				<Alert severity="error" sx={alertSx} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			{refreshSuccess && (
				<Alert severity="success" sx={alertSx} onClose={() => setRefreshSuccess(false)}>
					{t("dashboard.refreshCharactersSuccess")}
				</Alert>
			)}

			<Tabs
				value={tab}
				variant="scrollable"
				scrollButtons="auto"
				onChange={handleTabChange}
				slotProps={{
					indicator: {
						sx: tabIndicatorSx,
					},
				}}
				sx={[tabsSx, hasUnsavedChanges && tabsUnsavedSx]}
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

			{isAdmin && config && (
				<TabPanel value="admin" current={tab} mounted={mountedTabs}>
					<GuildConfigForm
						config={config}
						guildId={guildId!}
						onSave={handleSave}
						saving={saving}
						saveSuccess={saveSuccess}
						onDirtyChange={setHasUnsavedChanges}
						channels={channels}
						roles={roles}
						isStrictAdmin={isStrictAdmin}
					/>
				</TabPanel>
			)}
			{isAdmin && config && (
				<TabPanel value="template" current={tab} mounted={mountedTabs}>
					<Suspense fallback={<CircularProgress />}>
						<ModelConfigForm
							config={config}
							guildId={guildId!}
							onSave={handleSave}
							saving={saving}
							saveSuccess={saveSuccess}
							onDirtyChange={setHasUnsavedChanges}
							channels={channels}
							roles={roles}
						/>
					</Suspense>
				</TabPanel>
			)}
			<TabPanel value="user" current={tab} mounted={mountedTabs}>
				<UserConfigForm guildId={guildId!} initialConfig={userConfigData} />
			</TabPanel>
			{userCharCount > 0 && (
				<TabPanel value="characters" current={tab} mounted={mountedTabs}>
					<CharactersTab guildId={guildId!} refreshToken={charactersRefreshToken} />
				</TabPanel>
			)}
			{isAdmin && (
				<TabPanel value="server-characters" current={tab} mounted={mountedTabs}>
					<ServerCharactersTab guildId={guildId!} refreshToken={charactersRefreshToken} />
				</TabPanel>
			)}
		</Box>
	);
}
