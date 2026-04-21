import { authApi, type DiscordGuild, guildApi } from "@dicelette/api";
import { Add, Refresh, Search } from "@mui/icons-material";
import {
	Alert,
	Avatar,
	Box,
	Button,
	Card,
	CardActionArea,
	CardContent,
	CircularProgress,
	Divider,
	Grid,
	InputAdornment,
	SvgIcon,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../providers";

const pageHeaderSx = {
	display: "flex",
	flexDirection: "column",
	mb: 4,
	gap: { xs: 2, md: 0 },
} as const;
const titleRowSx = {
	display: "flex",
	flexDirection: { xs: "column", sm: "row" },
	justifyContent: "space-between",
	alignItems: { xs: "stretch", sm: "flex-start" },
	gap: 2,
} as const;
const refreshBoxSx = {
	display: "flex",
	justifyContent: { xs: "flex-start", sm: "flex-end" },
} as const;
const subtitleRowSx = {
	display: "flex",
	flexDirection: { xs: "column", sm: "row" },
	justifyContent: "space-between",
	alignItems: { xs: "stretch", sm: "center" },
	gap: 2,
} as const;
const subtitleTextSx = { flex: 1 } as const;
const searchFieldSx = {
	width: { xs: "100%", sm: 320 },
	maxWidth: { xs: "100%", sm: 320 },
} as const;
const alertSx = { mb: 3 } as const;
const botSectionTitleSx = { mb: 2, opacity: 0.8 } as const;
const botGridSx = { mb: 4 } as const;
const gridItemSx = { display: "flex" } as const;
const fullWidthCardSx = { width: "100%" } as const;
const fullHeightActionSx = { height: "100%" } as const;
const cardContentSx = { height: "100%", boxSizing: "border-box" } as const;
const botGuildAvatarSx = { width: 44, height: 44, bgcolor: "primary.main" } as const;
const guildNameBoxSx = {
	alignSelf: "stretch",
	display: "flex",
	flexDirection: "column",
	justifyContent: "center",
} as const;
const dividerSx = { mb: 3 } as const;
const adminSectionTitleSx = { mb: 1, opacity: 0.8 } as const;
const adminSubtitleSx = { mb: 2 } as const;
const adminGuildAvatarSx = { width: 44, height: 44, bgcolor: "secondary.dark" } as const;
const adminGuildCardSx = { opacity: 0.7 } as const;
const addButtonSx = { flexShrink: 0 } as const;

const GUILDS_CACHE_TTL = 5 * 60 * 1000;
let guildsClientCache: { guilds: DiscordGuild[]; expiresAt: number } | null = null;

function getErrorStatus(err: unknown): number | undefined {
	if (
		err &&
		typeof err === "object" &&
		"response" in err &&
		err.response &&
		typeof err.response === "object" &&
		"status" in err.response
	) {
		return (err.response as { status: number }).status;
	}
	return undefined;
}

export default function Servers() {
	const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const { t } = useI18n();
	const { enqueueToast } = useToast();
	const tRef = useRef(t);
	tRef.current = t;

	useEffect(() => {
		if (guildsClientCache && Date.now() < guildsClientCache.expiresAt) {
			setGuilds(guildsClientCache.guilds);
			setLoading(false);
			return;
		}
		setLoading(true);
		authApi
			.guilds()
			.then((res) => {
				guildsClientCache = {
					guilds: res.data,
					expiresAt: Date.now() + GUILDS_CACHE_TTL,
				};
				setGuilds(res.data);
			})
			.catch(() => setError(tRef.current("servers.loadError")))
			.finally(() => setLoading(false));
	}, []); // `t` removed — tRef always holds the current translator

	const handleRefresh = async () => {
		setRefreshing(true);
		setError(null);
		guildsClientCache = null;
		try {
			await authApi.refreshGuilds();
			const res = await authApi.guilds();
			guildsClientCache = { guilds: res.data, expiresAt: Date.now() + GUILDS_CACHE_TTL };
			setGuilds(res.data);
			enqueueToast(t("servers.refreshSuccess"));
		} catch (err: unknown) {
			const status = getErrorStatus(err);
			setError(status === 429 ? t("servers.rateLimitError") : t("servers.loadError"));
		} finally {
			setRefreshing(false);
		}
	};

	const botGuilds = useMemo(
		() =>
			guilds
				.filter((g) => g.botPresent)
				.sort((a, b) => {
					if (a.owner && !b.owner) return -1;
					if (!a.owner && b.owner) return 1;
					return a.name.localeCompare(b.name);
				}),
		[guilds]
	);
	const adminGuilds = useMemo(
		() =>
			guilds.filter((g) => !g.botPresent).sort((a, b) => a.name.localeCompare(b.name)),
		[guilds]
	);

	const normalizedSearch = useMemo(() => search.standardize(), [search]);
	const filteredBotGuilds = useMemo(
		() =>
			normalizedSearch.length === 0
				? botGuilds
				: botGuilds.filter((g) => g.name.subText(normalizedSearch)),
		[botGuilds, normalizedSearch]
	);
	const filteredAdminGuilds = useMemo(
		() =>
			normalizedSearch.length === 0
				? adminGuilds
				: adminGuilds.filter((g) => g.name.subText(normalizedSearch)),
		[adminGuilds, normalizedSearch]
	);

	const getGuildIcon = (guild: DiscordGuild) =>
		guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;

	const handleAddBot = async (guild: DiscordGuild) => {
		const res = await guildApi.addBot(guild.id);
		window.open(res.data.url, "_blank");

		const es = new EventSource("/api/auth/guild-events", { withCredentials: true });
		es.onmessage = (e: MessageEvent) => {
			const data = JSON.parse(e.data) as { guildId: string };
			if (data.guildId === guild.id) {
				es.close();
				handleRefresh();
			}
		};
		es.onerror = () => es.close();
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
			<Box sx={pageHeaderSx}>
				<Box sx={titleRowSx}>
					<Typography
						variant="h4"
						sx={{
							fontWeight: 700,
						}}
					>
						{t("servers.title")}
					</Typography>
					<Box sx={refreshBoxSx}>
						<Tooltip title={t("servers.refreshTooltip")}>
							<span>
								<Button
									size="small"
									variant="outlined"
									startIcon={refreshing ? <CircularProgress size={14} /> : <Refresh />}
									onClick={handleRefresh}
									disabled={refreshing || loading}
								>
									{t("servers.refresh")}
								</Button>
							</span>
						</Tooltip>
					</Box>
				</Box>

				<Box sx={subtitleRowSx}>
					<Typography
						variant="body2"
						sx={[
							{
								color: "text.secondary",
							},
							...(Array.isArray(subtitleTextSx) ? subtitleTextSx : [subtitleTextSx]),
						]}
					>
						{t("servers.subtitle")}
					</Typography>
					<TextField
						fullWidth
						size="small"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={t("servers.searchPlaceholder")}
						sx={searchFieldSx}
						slotProps={{
							input: {
								startAdornment: (
									<InputAdornment position="start">
										<Search fontSize="small" />
									</InputAdornment>
								),
							},
						}}
					/>
				</Box>
			</Box>
			{error && (
				<Alert severity="error" sx={alertSx}>
					{error}
				</Alert>
			)}
			{filteredBotGuilds.length > 0 && (
				<>
					<Typography variant="h6" sx={botSectionTitleSx}>
						{t("servers.botPresent")}
					</Typography>
					<Grid container spacing={2} sx={botGridSx}>
						{filteredBotGuilds.map((guild) => (
							<Grid size={{ xs: 12, sm: 6, md: 4 }} key={guild.id} sx={gridItemSx}>
								<Card sx={fullWidthCardSx}>
									<CardActionArea
										sx={fullHeightActionSx}
										onClick={() =>
											startTransition(() => navigate(`/dashboard/${guild.id}`))
										}
									>
										<CardContent
											className="flex items-center gap-3 p-4"
											sx={cardContentSx}
										>
											<Avatar
												src={getGuildIcon(guild) ?? undefined}
												sx={botGuildAvatarSx}
											>
												{guild.name[0]}
											</Avatar>
											<Box className="flex-1 min-w-0" sx={guildNameBoxSx}>
												<Typography
													variant="body1"
													sx={{
														fontWeight: 600,
														fontSize: "1.1rem",
														fontFamily: "var(--ifm-heading-font-family)",
													}}
												>
													{guild.name}
												</Typography>
											</Box>
											{guild.isAdmin && (
												<SvgIcon>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width={24}
														height={24}
														viewBox="0 0 24 24"
														opacity={0.4}
														aria-hidden="true"
														focusable="false"
													>
														<path
															fill="currentColor"
															d="M5.827 19v-1h12.346v1zm-.058-2.884L4.321 8.475q-.05.02-.112.022q-.063.003-.113.003q-.471 0-.783-.32T3 7.404q0-.473.313-.804q.312-.33.784-.33t.803.33q.33.331.33.804q0 .104-.008.193t-.059.176l3.202 1.285l2.971-4.045q-.217-.142-.344-.376q-.127-.233-.127-.503q0-.472.331-.803q.33-.331.803-.331q.472 0 .804.33t.332.8q0 .284-.127.512q-.127.23-.344.371l2.97 4.045l3.203-1.285q-.027-.08-.047-.175q-.02-.096-.02-.194q0-.473.312-.804q.312-.33.784-.33t.803.33q.331.331.331.804q0 .454-.332.775t-.806.321q-.038 0-.086-.012t-.104-.013l-1.441 7.64zm.854-1h10.754l1.227-6.137l-3.317 1.323L12 5.804l-3.286 4.498l-3.318-1.323zm5.377 0"
															strokeWidth={0.5}
															stroke="currentColor"
														/>
													</svg>
												</SvgIcon>
											)}
										</CardContent>
									</CardActionArea>
								</Card>
							</Grid>
						))}
					</Grid>
				</>
			)}
			{filteredAdminGuilds.length > 0 && (
				<>
					<Divider sx={dividerSx} />
					<Typography variant="h6" sx={adminSectionTitleSx}>
						{t("servers.addBotTitle")}
					</Typography>
					<Typography
						variant="body2"
						sx={[
							{
								color: "text.secondary",
							},
							...(Array.isArray(adminSubtitleSx) ? adminSubtitleSx : [adminSubtitleSx]),
						]}
					>
						{t("servers.addBotDesc")}
					</Typography>
					<Grid container spacing={2}>
						{filteredAdminGuilds.map((guild) => (
							<Grid size={{ xs: 12, sm: 6, md: 4 }} key={guild.id}>
								<Card sx={adminGuildCardSx}>
									<CardContent className="flex items-center gap-3 p-4">
										<Avatar
											src={getGuildIcon(guild) ?? undefined}
											sx={adminGuildAvatarSx}
										>
											{guild.name[0]}
										</Avatar>
										<Box className="flex-1 min-w-0">
											<Typography
												variant="body1"
												noWrap
												sx={{
													fontWeight: 600,
												}}
											>
												{guild.name}
											</Typography>
										</Box>
										<Button
											size="small"
											variant="outlined"
											startIcon={<Add />}
											onClick={() => handleAddBot(guild)}
											sx={addButtonSx}
										>
											{t("common.add")}
										</Button>
									</CardContent>
								</Card>
							</Grid>
						))}
					</Grid>
				</>
			)}
			{guilds.length > 0 &&
				normalizedSearch.length > 0 &&
				filteredBotGuilds.length === 0 &&
				filteredAdminGuilds.length === 0 && (
					<Alert severity="info">{t("servers.noSearchResults")}</Alert>
				)}
			{!loading && guilds.length === 0 && (
				<Alert severity="info">{t("servers.noServers")}</Alert>
			)}
		</Box>
	);
}
