import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import type { DiscordGuild } from "../lib/api";
import { authApi, guildApi } from "../lib/api";

export default function ServerSelectPage() {
	const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		authApi
			.guilds()
			.then((res) => setGuilds(res.data))
			.catch(() => setError("Impossible de charger les serveurs."))
			.finally(() => setLoading(false));
	}, []);

	const botGuilds = guilds.filter((g) => g.botPresent);
	const adminGuilds = guilds.filter((g) => !g.botPresent);

	const getGuildIcon = (guild: DiscordGuild) =>
		guild.icon
			? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
			: null;

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
				Vos serveurs
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
				Sélectionnez un serveur pour gérer sa configuration.
			</Typography>

			{error && (
				<Alert severity="error" sx={{ mb: 3 }}>
					{error}
				</Alert>
			)}

			{botGuilds.length > 0 && (
				<>
					<Typography variant="h6" sx={{ mb: 2, opacity: 0.8 }}>
						Dicelette est présent
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
													<Chip label="Propriétaire" size="small" sx={{ mt: 0.5 }} />
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
						Ajouter Dicelette
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Vous êtes administrateur sur ces serveurs — vous pouvez y ajouter le bot.
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
											Ajouter
										</Button>
									</CardContent>
								</Card>
							</Grid>
						))}
					</Grid>
				</>
			)}

			{!loading && guilds.length === 0 && (
				<Alert severity="info">
					Aucun serveur trouvé. Assurez-vous d'être administrateur d'au moins un serveur Discord.
				</Alert>
			)}
		</Box>
	);
}
