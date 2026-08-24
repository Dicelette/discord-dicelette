import type { ApiKarmaEntry } from "@dicelette/api";
import { karmaApi } from "@dicelette/api";
import {
	ALL_KARMA_OPTIONS,
	type KarmaOption,
	type KarmaSortMode,
} from "@dicelette/utils";
import { ArrowBack } from "@mui/icons-material";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { AppTopBar, DocsButton, PlaygroundButton, useI18n } from "@shared";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import KarmaLeaderboard from "../../features/karma/ui/KarmaLeaderboard";
import { useAuth } from "../../providers";

function parseOption(value: string | null): KarmaOption {
	return ALL_KARMA_OPTIONS.includes(value as KarmaOption)
		? (value as KarmaOption)
		: "total";
}

function parseSortMode(value: string | null): KarmaSortMode {
	return value === "ratio" ? "ratio" : "brut";
}

function parseThreshold(value: string | null): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

const mainSx = {
	maxWidth: "56rem",
	mx: "auto",
	px: { xs: 2, sm: 3 },
	py: 3,
	width: "100%",
} as const;
const backButtonSx = { mb: 3 } as const;

export default function KarmaLeaderboardPage() {
	const { t } = useI18n();
	const { user } = useAuth();
	const { guildId = "" } = useParams<{ guildId: string }>();
	const [searchParams] = useSearchParams();
	const [users, setUsers] = useState<ApiKarmaEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		setLoading(true);
		setError(null);
		karmaApi
			.getPublicLeaderboard(guildId)
			.then((res) => {
				if (active) setUsers(res.data.users);
			})
			.catch(() => {
				if (active) setError(t("karma.loadError"));
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [guildId, t]);

	const title = t("karma.leaderboard.title");

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
				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
						<CircularProgress />
					</Box>
				) : error ? (
					<Alert severity="error">{error}</Alert>
				) : (
					<KarmaLeaderboard
						guildId={guildId}
						users={users}
						initialOption={parseOption(searchParams.get("option"))}
						initialSortMode={parseSortMode(searchParams.get("sortMode"))}
						initialThreshold={parseThreshold(searchParams.get("threshold"))}
					/>
				)}
			</Box>
		</Box>
	);
}
