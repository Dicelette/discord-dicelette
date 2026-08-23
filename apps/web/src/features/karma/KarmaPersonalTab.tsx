import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { useI18n } from "@shared";
import { buildKarmaShareHref } from "./shareLink";
import KarmaCountCard from "./ui/KarmaCountCard";
import KarmaResetPanel from "./ui/KarmaResetPanel";
import { useKarmaOverview } from "./useKarmaOverview";

interface Props {
	guildId: string;
	currentUserId: string;
	currentUserName: string;
	isAdmin: boolean;
	refreshToken?: number;
}

export default function KarmaPersonalTab({
	guildId,
	currentUserId,
	currentUserName,
	isAdmin,
	refreshToken = 0,
}: Props) {
	const { t } = useI18n();
	const { overview, loading, error, reload } = useKarmaOverview(guildId, refreshToken);

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
			<KarmaResetPanel
				guildId={guildId}
				isAdmin={isAdmin}
				users={overview.users}
				onReset={reload}
			/>
			<Box sx={{ mb: 3 }}>
				<Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
					{t("karma.myKarma")}
				</Typography>
				{overview.me ? (
					<KarmaCountCard
						displayName={currentUserName}
						avatar={overview.meAvatar}
						count={overview.me}
						shareHref={buildKarmaShareHref(guildId, currentUserId)}
					/>
				) : (
					<Typography sx={{ color: "text.secondary" }}>
						{t("karma.noPersonalData")}
					</Typography>
				)}
			</Box>
		</Box>
	);
}
