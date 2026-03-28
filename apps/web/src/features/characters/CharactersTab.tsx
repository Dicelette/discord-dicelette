import { type ApiCharacter, charactersApi } from "@dicelette/dashboard-api";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import {
	Alert,
	Box,
	CircularProgress,
	IconButton,
	InputAdornment,
	Pagination,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { useCallback, useEffect, useState } from "react";
import CharacterCard from "./ui/CharacterCard";

const PAGE_SIZE = 5;

interface Props {
	guildId: string;
}

export default function CharactersTab({ guildId }: Props) {
	const { t } = useI18n();
	const [characters, setCharacters] = useState<ApiCharacter[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");

	const load = useCallback(
		async (forceRefresh = false) => {
			setError(null);
			if (forceRefresh) {
				setRefreshing(true);
				try {
					await charactersApi.refresh(guildId);
				} catch {
					// ignore
				}
			}
			try {
				const res = await charactersApi.getCharacters(guildId);
				setCharacters(res.data);
				setPage(1);
			} catch {
				setError(t("characters.loadError"));
			} finally {
				setLoading(false);
				setRefreshing(false);
			}
		},
		[guildId, t]
	);

	useEffect(() => {
		load();
	}, [load]);

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
				<CircularProgress />
			</Box>
		);
	}

	const filtered = search.trim()
		? characters.filter((c) =>
				(c.charName ?? "").toLowerCase().includes(search.trim().toLowerCase())
			)
		: characters;
	const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
	const pageChars = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	return (
		<Box>
			{/* Header : titre + recherche + refresh sur la même ligne */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: characters.length > 0
						? { xs: "1fr auto", sm: "auto 1fr auto" }
						: { xs: "1fr auto" },
					alignItems: "center",
					gap: 2,
					mb: 3,
				}}
			>
				<Typography variant="h5" fontWeight={600} sx={{ whiteSpace: "nowrap" }}>
					{t("characters.title")}
				</Typography>

				{characters.length > 0 && (
					<TextField
						size="small"
						placeholder={t("characters.filterPlaceholder")}
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
						sx={{ width: "100%", display: { xs: "none", sm: "flex" } }}
					/>
				)}

				<Tooltip title={t("characters.refreshTooltip")}>
					<span>
						<IconButton onClick={() => load(true)} disabled={refreshing} size="small">
							<RefreshIcon
								sx={{
									transition: "transform 0.4s",
									transform: refreshing ? "rotate(360deg)" : "none",
								}}
							/>
						</IconButton>
					</span>
				</Tooltip>
			</Box>

			{characters.length > 0 && (
				<TextField
					size="small"
					placeholder={t("characters.filterPlaceholder")}
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
					sx={{ mb: 2, width: "100%", display: { xs: "flex", sm: "none" } }}
				/>
			)}

			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{filtered.length === 0 ? (
				<Typography color="text.secondary">
					{search.trim() ? t("characters.noResults") : t("characters.noCharacters")}
				</Typography>
			) : (
				<>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
						{pageChars.map((char) => (
							<CharacterCard key={`${char.channelId}-${char.messageId}`} char={char} />
						))}
					</Box>

					{totalPages > 1 && (
						<Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
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
