import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import type { DiscordGuild } from "../lib/api";
import { authApi, guildApi } from "../lib/api";

export default function ServerSelectPage() {
	const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const { t } = useI18n();

	useEffect(() => {
		authApi
			.guilds()
			.then((res) => setGuilds(res.data))
			.catch(() => setError(t("servers.loadError")))
			.finally(() => setLoading(false));
	}, [t]);

	const botGuilds = guilds.filter((g) => g.botPresent);
	const adminGuilds = guilds.filter((g) => !g.botPresent);

	const getGuildIcon = (guild: DiscordGuild) =>
		guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;

	const handleAddBot = async (guild: DiscordGuild) => {
		const res = await guildApi.addBot(guild.id);
		window.open(res.data.url, "_blank");
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
			<Typography variant="h4" gutterBottom fontWeight={700} sx={{ mb: 1 }}>
				{t("servers.title")}
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
				{t("servers.subtitle")}
			</Typography>

			{error && (
				<Alert severity="error" sx={{ mb: 3 }}>
					{error}
				</Alert>
			)}

			{botGuilds.length > 0 && (
				<>
					<Typography variant="h6" sx={{ mb: 2, opacity: 0.8 }}>
						{t("servers.botPresent")}
					</Typography>
					<Grid container spacing={2} sx={{ mb: 4 }}>
						{botGuilds.map((guild) => (
							<Grid item xs={12} sm={6} md={4} key={guild.id}>
								<Card>
									<CardActionArea onClick={() => navigate(`/dashboard/${guild.id}`)}>
										<CardContent className="flex items-center gap-3 p-4">
											<Avatar
												src={getGuildIcon(guild) ?? undefined}
												sx={{ width: 44, height: 44, bgcolor: "primary.main" }}
											>
												{guild.name[0]}
											</Avatar>
											<Box className="flex-1 min-w-0">
												<Typography variant="body1" fontWeight={600} noWrap>
													{guild.name}
												</Typography>
												{guild.owner && (
													<Chip label={t("common.owner")} size="small" sx={{ mt: 0.5 }} />
												)}
											</Box>
											<SettingsIcon sx={{ opacity: 0.4, flexShrink: 0 }} />
										</CardContent>
									</CardActionArea>
								</Card>
							</Grid>
						))}
					</Grid>
				</>
			)}

			{adminGuilds.length > 0 && (
				<>
					<Divider sx={{ mb: 3 }} />
					<Typography variant="h6" sx={{ mb: 1, opacity: 0.8 }}>
						{t("servers.addBotTitle")}
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						{t("servers.addBotDesc")}
					</Typography>
					<Grid container spacing={2}>
						{adminGuilds.map((guild) => (
							<Grid item xs={12} sm={6} md={4} key={guild.id}>
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
											startIcon={<AddIcon />}
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

			{!loading && guilds.length === 0 && (
				<Alert severity="info">{t("servers.noServers")}</Alert>
			)}
		</Box>
	);
}
