import { keyframes } from "@emotion/react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { ReactNode } from "react";

const spinAnimation = keyframes`
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
`;

import {
	Badge,
	Casino,
	Description,
	Dns,
	Face,
	Groups,
	Leaderboard,
	Menu as MenuIcon,
	Person,
	Settings,
} from "@mui/icons-material";
import {
	Alert,
	Avatar,
	Box,
	Button,
	CircularProgress,
	Drawer,
	IconButton,
	Tooltip,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	CharactersTab,
	GuildConfigForm,
	KarmaPersonalTab,
	KarmaServerTab,
	ServerCharactersTab,
	UserConfigForm,
	useKarmaOverview,
} from "../features";
import { GuildConfigProvider } from "../features/guild-config/context";
import { useAuth, useToast } from "../providers";
import DashboardNav, { type DashboardNavGroup } from "./DashboardNav";
import { type ActiveTab, useDashboard } from "./hooks/useDashboard";

const ModelConfigForm = lazy(() => import("../features/template-config/ModelConfigForm"));
const TemplateReadOnly = lazy(
	() => import("../features/template-config/TemplateReadOnly")
);

const navIconSx = { fontSize: 20 } as const;
const sidebarBoxSx = {
	display: { xs: "none", md: "block" },
	width: 232,
	flexShrink: 0,
} as const;
const drawerPaperSx = { width: 260, pt: 1 } as const;
const layoutRowSx = {
	display: "flex",
	gap: { md: 4 },
	alignItems: "flex-start",
} as const;
const contentBoxSx = { flex: 1, minWidth: 0 } as const;

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
	return <Box sx={{ display: current === value ? undefined : "none" }}>{children}</Box>;
}

export default function Dashboard() {
	const { guildId } = useParams<{ guildId: string }>();
	const navigate = useNavigate();
	const { t } = useI18n();
	const { enqueueToast } = useToast();
	const { user } = useAuth();
	const [drawerOpen, setDrawerOpen] = useState(false);

	const {
		tab,
		mountedTabs,
		isAdmin,
		isStrictAdmin,
		userCharCount,
		hasTemplate,
		config,
		userConfigData,
		loading,
		error,
		setError,
		saving,
		saveSuccess,
		refreshingCharacters,
		refreshSuccess,
		charactersRefreshToken,
		hasUnsavedChanges,
		channels,
		roles,
		guildName,
		guildIcon,
		handleSave,
		handleCharactersRefresh,
		handleTabChange,
		refetchConfig,
		bumpCharactersRefreshToken,
	} = useDashboard(guildId);

	const karmaOverview = useKarmaOverview(guildId ?? "");

	/** Cheap, cache-respecting re-fetch of the tab's own data — fired on every tab switch. */
	const refreshTabData = (value: ActiveTab) => {
		switch (value) {
			case "admin":
			case "template":
				void refetchConfig();
				break;
			case "characters":
			case "server-characters":
				bumpCharactersRefreshToken();
				break;
			case "karma-server":
			case "karma-me":
				void karmaOverview.reload();
				break;
			default:
				break;
		}
	};

	const guildIconUrl =
		guildId && guildIcon
			? `https://cdn.discordapp.com/icons/${guildId}/${guildIcon}.png`
			: null;
	const headerLabel = guildName ?? t("dashboard.title");

	useEffect(() => {
		if (saveSuccess) enqueueToast(t("dashboard.saveSuccess"));
	}, [saveSuccess, enqueueToast, t]);

	useEffect(() => {
		if (refreshSuccess) enqueueToast(t("dashboard.refreshCharactersSuccess"));
	}, [refreshSuccess, enqueueToast, t]);

	if (loading) {
		return (
			<Box className="flex items-center justify-center p-16">
				<CircularProgress />
			</Box>
		);
	}

	const configurationItems: DashboardNavGroup["items"] = [];
	if (isAdmin) {
		configurationItems.push({
			value: "admin",
			label: t("dashboard.tabs.admin"),
			icon: <Dns sx={navIconSx} />,
		});
		configurationItems.push({
			value: "template",
			label: t("dashboard.tabs.template"),
			icon: <Description sx={navIconSx} />,
		});
	} else if (hasTemplate) {
		configurationItems.push({
			value: "template",
			label: t("dashboard.tabs.templateView"),
			icon: <Description sx={navIconSx} />,
		});
	}
	configurationItems.push({
		value: "user",
		label: t("dashboard.tabs.user"),
		icon: <Person sx={navIconSx} />,
	});

	const charactersItems: DashboardNavGroup["items"] = [];
	if (isAdmin && config?.templateID?.channelId) {
		charactersItems.push({
			value: "server-characters",
			label: t("dashboard.tabs.serverCharacters"),
			icon: <Groups sx={navIconSx} />,
		});
	}
	if (userCharCount > 0) {
		charactersItems.push({
			value: "characters",
			label: t("dashboard.tabs.characters"),
			icon: <Face sx={navIconSx} />,
		});
	}

	const navGroups: DashboardNavGroup[] = [
		{
			id: "configuration",
			label: t("dashboard.tabs.groups.configuration"),
			icon: <Settings sx={navIconSx} />,
			items: configurationItems,
		},
	];
	if (charactersItems.length > 0) {
		navGroups.push({
			id: "characters",
			label: t("dashboard.tabs.groups.characters"),
			icon: <Badge sx={navIconSx} />,
			items: charactersItems,
		});
	}
	navGroups.push({
		id: "karma",
		label: t("dashboard.tabs.groups.karma"),
		icon: <Casino sx={navIconSx} />,
		items: [
			{
				value: "karma-server",
				label: t("dashboard.tabs.karmaServer"),
				icon: <Leaderboard sx={navIconSx} />,
			},
			{
				value: "karma-me",
				label: t("dashboard.tabs.karmaMe"),
				icon: <Person sx={navIconSx} />,
			},
		],
	});

	const selectTab = (value: ActiveTab) => {
		setDrawerOpen(false);
		if (hasUnsavedChanges) return;
		if (value !== tab) handleTabChange(undefined, value);
		refreshTabData(value);
	};

	return (
		<Box sx={{ maxWidth: "72rem", mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
			<Box
				sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
			>
				<Button
					startIcon={<ArrowBackIcon />}
					onClick={() => navigate("/")}
					sx={{ mb: 3 }}
				>
					{t("common.back")}
				</Button>
				<IconButton
					onClick={() => setDrawerOpen(true)}
					sx={{ display: { xs: "inline-flex", md: "none" }, mb: 3 }}
					aria-label={t("dashboard.openNav")}
				>
					<MenuIcon />
				</IconButton>
			</Box>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 2,
					mb: 3,
				}}
			>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
					<Avatar
						src={guildIconUrl ?? undefined}
						alt={headerLabel}
						sx={{ width: 44, height: 44, bgcolor: "primary.main" }}
					>
						{headerLabel[0]?.toUpperCase()}
					</Avatar>
					<Typography
						variant="h4"
						noWrap
						sx={{
							fontWeight: 700,
							mb: 0,
						}}
					>
						{headerLabel}
					</Typography>
				</Box>
				{(tab === "characters" || tab === "server-characters") && (
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
				)}
			</Box>
			{error && (
				<Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			<Box sx={layoutRowSx}>
				<Box component="nav" sx={sidebarBoxSx}>
					<DashboardNav groups={navGroups} current={tab} onSelect={selectTab} />
				</Box>
				<Drawer
					anchor="left"
					open={drawerOpen}
					onClose={() => setDrawerOpen(false)}
					slotProps={{ paper: { sx: drawerPaperSx } }}
				>
					<DashboardNav groups={navGroups} current={tab} onSelect={selectTab} />
				</Drawer>
				<Box sx={contentBoxSx}>
					{isAdmin && config && (
						<TabPanel value="admin" current={tab} mounted={mountedTabs}>
							<GuildConfigProvider
								config={config}
								channels={channels}
								roles={roles}
								isStrictAdmin={isStrictAdmin}
								saving={saving}
								saveSuccess={saveSuccess}
								onSave={handleSave}
							>
								<GuildConfigForm />
							</GuildConfigProvider>
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
									channels={channels}
									roles={roles}
									onTemplateChange={refetchConfig}
									onCharactersDeleted={handleCharactersRefresh}
								/>
							</Suspense>
						</TabPanel>
					)}
					{!isAdmin && hasTemplate && (
						<TabPanel value="template" current={tab} mounted={mountedTabs}>
							<Suspense fallback={<CircularProgress />}>
								<TemplateReadOnly guildId={guildId!} />
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
					{isAdmin && config?.templateID?.channelId && (
						<TabPanel value="server-characters" current={tab} mounted={mountedTabs}>
							<ServerCharactersTab
								guildId={guildId!}
								refreshToken={charactersRefreshToken}
							/>
						</TabPanel>
					)}
					<TabPanel value="karma-server" current={tab} mounted={mountedTabs}>
						<KarmaServerTab
							guildId={guildId!}
							currentUserId={user!.id}
							overview={karmaOverview.overview}
							loading={karmaOverview.loading}
							error={karmaOverview.error}
						/>
					</TabPanel>
					<TabPanel value="karma-me" current={tab} mounted={mountedTabs}>
						<KarmaPersonalTab
							guildId={guildId!}
							currentUserId={user!.id}
							currentUserName={user!.global_name ?? user!.username}
							currentUserHandle={`@${user!.username}`}
							isAdmin={isAdmin}
							overview={karmaOverview.overview}
							loading={karmaOverview.loading}
							error={karmaOverview.error}
							onReset={karmaOverview.reload}
						/>
					</TabPanel>
				</Box>
			</Box>
		</Box>
	);
}
