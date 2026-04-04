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
import { startTransition, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Servers() {
	const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const { t } = useI18n();

	useEffect(() => {
		setLoading(true);
		authApi
			.guilds()
			.then((res) => setGuilds(res.data))
			.catch(() => setError(t("servers.loadError")))
			.finally(() => setLoading(false));
	}, [t]);

	const handleRefresh = async () => {
		setRefreshing(true);
		setError(null);
		try {
			await authApi.refreshGuilds();
			const res = await authApi.guilds();
			setGuilds(res.data);
		} catch (err: unknown) {
			const status =
				err &&
				typeof err === "object" &&
				"response" in err &&
				err.response &&
				typeof err.response === "object" &&
				"status" in err.response
					? (err.response as { status: number }).status
					: undefined;
			setError(status === 429 ? t("servers.rateLimitError") : t("servers.loadError"));
		} finally {
			setRefreshing(false);
		}
	};

	const botGuilds = guilds
		.filter((g) => g.botPresent)
		.sort((a, b) => {
			//on va trier par ordre alphabétique wtf
			//first sort by owner status, then by name
			if (a.owner && !b.owner) return -1;
			if (!a.owner && b.owner) return 1;
			return a.name.localeCompare(b.name);
		});
	const adminGuilds = guilds
		.filter((g) => !g.botPresent)
		.sort((a, b) => a.name.localeCompare(b.name));

	const normalizedSearch = search.standardize();
	const matchesSearch = (guild: DiscordGuild) =>
		normalizedSearch.length === 0 || guild.name.subText(normalizedSearch);
	const filteredBotGuilds = botGuilds.filter(matchesSearch);
	const filteredAdminGuilds = adminGuilds.filter(matchesSearch);

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
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					mb: 4,
					gap: { xs: 2, md: 0 },
				}}
			>
				<Box
					sx={{
						display: "flex",
						flexDirection: { xs: "column", sm: "row" },
						justifyContent: "space-between",
						alignItems: { xs: "stretch", sm: "flex-start" },
						gap: 2,
					}}
				>
					<Typography variant="h4" fontWeight={700}>
						{t("servers.title")}
					</Typography>
					<Box
						sx={{ display: "flex", justifyContent: { xs: "flex-start", sm: "flex-end" } }}
					>
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

				<Box
					sx={{
						display: "flex",
						flexDirection: { xs: "column", sm: "row" },
						justifyContent: "space-between",
						alignItems: { xs: "stretch", sm: "center" },
						gap: 2,
					}}
				>
					<Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
						{t("servers.subtitle")}
					</Typography>
					<TextField
						fullWidth
						size="small"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={t("servers.searchPlaceholder")}
						sx={{ width: { xs: "100%", sm: 320 }, maxWidth: { xs: "100%", sm: 320 } }}
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
				<Alert severity="error" sx={{ mb: 3 }}>
					{error}
				</Alert>
			)}

			{filteredBotGuilds.length > 0 && (
				<>
					<Typography variant="h6" sx={{ mb: 2, opacity: 0.8 }}>
						{t("servers.botPresent")}
					</Typography>
					<Grid container spacing={2} sx={{ mb: 4 }}>
						{filteredBotGuilds.map((guild) => (
							<Grid
								size={{ xs: 12, sm: 6, md: 4 }}
								key={guild.id}
								sx={{ display: "flex" }}
							>
								<Card sx={{ width: "100%" }}>
									<CardActionArea
										sx={{ height: "100%" }}
										onClick={() =>
											startTransition(() => navigate(`/dashboard/${guild.id}`))
										}
									>
										<CardContent
											className="flex items-center gap-3 p-4"
											sx={{ height: "100%", boxSizing: "border-box" }}
										>
											<Avatar
												src={getGuildIcon(guild) ?? undefined}
												sx={{ width: 44, height: 44, bgcolor: "primary.main" }}
											>
												{guild.name[0]}
											</Avatar>
											<Box
												className="flex-1 min-w-0"
												sx={{
													alignSelf: "stretch",
													display: "flex",
													flexDirection: "column",
													justifyContent: "center",
												}}
											>
												<Typography
													variant="body1"
													fontWeight={600}
													fontSize={"1.1rem"}
													fontFamily={"var(--ifm-heading-font-family)"}
												>
													{guild.name}
												</Typography>
											</Box>
											{guild.isAdmin && (
												<SvgIcon>
													{/** biome-ignore lint/a11y/noSvgWithoutTitle: wtf */}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width={24}
														height={24}
														viewBox="0 0 24 24"
														opacity={0.4}
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
					<Divider sx={{ mb: 3 }} />
					<Typography variant="h6" sx={{ mb: 1, opacity: 0.8 }}>
						{t("servers.addBotTitle")}
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						{t("servers.addBotDesc")}
					</Typography>
					<Grid container spacing={2}>
						{filteredAdminGuilds.map((guild) => (
							<Grid size={{ xs: 12, sm: 6, md: 4 }} key={guild.id}>
								<Card sx={{ opacity: 0.7 }}>
									<CardContent className="flex items-center gap-3 p-4">
										<Avatar
											src={getGuildIcon(guild) ?? undefined}
											sx={{ width: 44, height: 44, bgcolor: "secondary.dark" }}
										>
											{guild.name[0]}
										</Avatar>
										<Box className="flex-1 min-w-0">
											<Typography variant="body1" fontWeight={600} noWrap>
												{guild.name}
											</Typography>
										</Box>
										<Button
											size="small"
											variant="outlined"
											startIcon={<Add />}
											onClick={() => handleAddBot(guild)}
											sx={{ flexShrink: 0 }}
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
