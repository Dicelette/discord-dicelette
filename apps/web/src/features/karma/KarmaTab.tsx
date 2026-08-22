import type { ApiKarmaEntry, ApiKarmaOverview } from "@dicelette/api";
import { karmaApi } from "@dicelette/api";
import SearchIcon from "@mui/icons-material/Search";
import {
	Alert,
	Box,
	CircularProgress,
	InputAdornment,
	Pagination,
	TextField,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "uniformize";
import { buildKarmaShareHref } from "./shareLink";
import KarmaCountCard from "./ui/KarmaCountCard";
import KarmaResetPanel from "./ui/KarmaResetPanel";
import KarmaServerStats from "./ui/KarmaServerStats";

const PAGE_SIZE = 5;

const searchFieldSx = { width: { xs: "100%", sm: 320 }, mb: 2 } as const;
const listBoxSx = { display: "flex", flexDirection: "column", gap: 2 } as const;
const paginationBoxSx = { display: "flex", justifyContent: "center", mt: 3 } as const;

interface Props {
	guildId: string;
	currentUserId: string;
	currentUserName: string;
	isAdmin: boolean;
	refreshToken?: number;
}

export default function KarmaTab({
	guildId,
	currentUserId,
	currentUserName,
	isAdmin,
	refreshToken = 0,
}: Props) {
	const { t } = useI18n();
	const [overview, setOverview] = useState<ApiKarmaOverview | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const lastRefreshToken = useRef(refreshToken);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await karmaApi.getOverview(guildId);
			setOverview(res.data);
		} catch {
			setError(t("karma.loadError"));
		} finally {
			setLoading(false);
		}
	}, [guildId, t]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		if (lastRefreshToken.current === refreshToken) return;
		lastRefreshToken.current = refreshToken;
		load();
	}, [load, refreshToken]);

	const query = useMemo(() => search.trim().toLowerCase(), [search]);
	const otherUsers = useMemo(
		() => (overview?.users ?? []).filter((u) => u.userId !== currentUserId),
		[overview, currentUserId]
	);
	const filtered = useMemo(() => {
		if (!query) return otherUsers;
		return otherUsers.filter(
			(u) => (u.displayName ?? "").subText(query) || u.userId.includes(query)
		);
	}, [otherUsers, query]);
	const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
	const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
				onReset={load}
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

			<Box sx={{ mb: 3 }}>
				<KarmaServerStats server={overview.server} />
			</Box>

			<Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
				{t("karma.searchTitle")}
			</Typography>
			<TextField
				size="small"
				placeholder={t("karma.searchPlaceholder")}
				value={search}
				onChange={(e) => {
					setSearch(e.target.value);
					setPage(1);
				}}
				slotProps={{
					input: {
						startAdornment: (
							<InputAdornment position="start">
								<SearchIcon fontSize="small" />
							</InputAdornment>
						),
					},
				}}
				sx={searchFieldSx}
			/>
			{filtered.length === 0 ? (
				<Typography sx={{ color: "text.secondary" }}>
					{query ? t("karma.noSearchResults") : t("karma.noData")}
				</Typography>
			) : (
				<>
					<Box sx={listBoxSx}>
						{pageUsers.map((entry: ApiKarmaEntry) => (
							<KarmaCountCard
								key={entry.userId}
								displayName={entry.displayName}
								avatar={entry.avatar}
								count={entry}
								shareHref={buildKarmaShareHref(guildId, entry.userId)}
							/>
						))}
					</Box>
					{totalPages > 1 && (
						<Box sx={paginationBoxSx}>
							<Pagination
								count={totalPages}
								page={page}
								onChange={(_e, value) => setPage(value)}
								color="primary"
								shape="rounded"
							/>
						</Box>
					)}
				</>
			)}
		</Box>
	);
}
