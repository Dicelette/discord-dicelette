import type { ApiKarmaOverview } from "@dicelette/api";
import { Alert, Box, CircularProgress } from "@mui/material";
import KarmaLeaderboard from "./ui/KarmaLeaderboard";
import KarmaSearchList from "./ui/KarmaSearchList";
import KarmaServerStats from "./ui/KarmaServerStats";

interface Props {
	guildId: string;
	currentUserId: string;
	overview: ApiKarmaOverview | null;
	loading: boolean;
	error: string | null;
}

export default function KarmaServerTab({
	guildId,
	currentUserId,
	overview,
	loading,
	error,
}: Props) {
	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (error) return <Alert severity="error">{error}</Alert>;
	if (!overview) return null;

	return (
		<Box>
			<Box sx={{ mb: 3 }}>
				<KarmaServerStats server={overview.server} />
			</Box>

			<KarmaLeaderboard guildId={guildId} users={overview.users} />

			<KarmaSearchList
				guildId={guildId}
				users={overview.users}
				excludeUserId={currentUserId}
			/>
		</Box>
	);
}
