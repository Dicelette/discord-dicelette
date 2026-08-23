import type { ApiKarmaOverview } from "@dicelette/api";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { useI18n } from "@shared";
import { buildKarmaShareHref } from "./shareLink";
import KarmaCountCard from "./ui/KarmaCountCard";
import KarmaResetPanel from "./ui/KarmaResetPanel";

interface Props {
	guildId: string;
	currentUserId: string;
	currentUserName: string;
	isAdmin: boolean;
	overview: ApiKarmaOverview | null;
	loading: boolean;
	error: string | null;
	onReset: () => void;
}

export default function KarmaPersonalTab({
	guildId,
	currentUserId,
	currentUserName,
	isAdmin,
	overview,
	loading,
	error,
	onReset,
}: Props) {
	const { t } = useI18n();

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
				onReset={onReset}
			/>
			<Box sx={{ mb: 3 }}>
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
