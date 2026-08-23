import type { ApiKarmaEntry } from "@dicelette/api";
import { karmaApi } from "@dicelette/api";
import { ArrowBack } from "@mui/icons-material";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { AppTopBar, DocsButton, PlaygroundButton, useI18n } from "@shared";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import KarmaCountCard from "../../features/karma/ui/KarmaCountCard";
import { useAuth } from "../../providers";

const mainSx = {
	maxWidth: "40rem",
	mx: "auto",
	px: { xs: 2, sm: 3 },
	py: 3,
	width: "100%",
} as const;
const backButtonSx = { mb: 3 } as const;

export default function KarmaPage() {
	const { t } = useI18n();
	const { user } = useAuth();
	const { guildId = "", userId = "" } = useParams<{ guildId: string; userId: string }>();
	const [entry, setEntry] = useState<ApiKarmaEntry | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		setLoading(true);
		setError(null);
		karmaApi
			.getPublicKarma(guildId, userId)
			.then((res) => {
				if (active) setEntry(res.data);
			})
			.catch((err) => {
				if (!active) return;
				setError(
					err?.response?.status === 404 ? t("karma.notFound") : t("karma.loadError")
				);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [guildId, userId, t]);

	const title = t("karma.publicTitle");

	return (
		<Box className="min-h-screen flex flex-col">
			<meta charSet="UTF-8" />
			<meta
				name="viewport"
				content="width=device-width, initial-scale=1.0, viewport-fit=cover"
			/>
			<title>{`Dicelette — ${title}`}</title>
			<AppTopBar
				leadingNav={
					<>
						<DocsButton />
						<PlaygroundButton />
					</>
				}
			/>
			<Box component="main" className="flex-1" sx={mainSx}>
				{user && (
					<Button component={Link} to="/" startIcon={<ArrowBack />} sx={backButtonSx}>
						{t("common.back")}
					</Button>
				)}
				<Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
					{title}
				</Typography>
				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
						<CircularProgress />
					</Box>
				) : error ? (
					<Alert severity="error">{error}</Alert>
				) : (
					entry && (
						<KarmaCountCard
							displayName={entry.displayName}
							avatar={entry.avatar}
							count={entry}
						/>
					)
				)}
			</Box>
		</Box>
	);
}
