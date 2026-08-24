import type { ApiKarmaEntry } from "@dicelette/api";
import SearchIcon from "@mui/icons-material/Search";
import { Box, InputAdornment, Pagination, TextField, Typography } from "@mui/material";
import { useI18n } from "@shared";
import { useMemo, useState } from "react";
import "uniformize";
import { buildKarmaShareHref } from "../shareLink";
import KarmaCountCard from "./KarmaCountCard";

const PAGE_SIZE = 5;

const searchFieldSx = { width: { xs: "100%", sm: 320 }, mb: 2 } as const;
const listBoxSx = { display: "flex", flexDirection: "column", gap: 2 } as const;
const paginationBoxSx = { display: "flex", justifyContent: "center", mt: 3 } as const;

interface Props {
	guildId: string;
	users: ApiKarmaEntry[];
	/** Exclude this user from the results (e.g. the viewer's own entry, shown elsewhere). */
	excludeUserId?: string;
}

export default function KarmaSearchList({ guildId, users, excludeUserId }: Props) {
	const { t } = useI18n();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);

	const query = useMemo(() => search.trim().toLowerCase(), [search]);
	const searchableUsers = useMemo(
		() => (excludeUserId ? users.filter((u) => u.userId !== excludeUserId) : users),
		[users, excludeUserId]
	);
	const filtered = useMemo(() => {
		if (!query) return searchableUsers;
		return searchableUsers.filter(
			(u) => (u.displayName ?? "").subText(query) || u.userId.includes(query)
		);
	}, [searchableUsers, query]);
	const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
	const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	return (
		<Box>
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
								username={entry.username}
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
