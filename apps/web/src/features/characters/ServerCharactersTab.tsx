import { type ApiCharacter, charactersApi } from "@dicelette/api";
import PersonIcon from "@mui/icons-material/Person";
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
import { useCallback, useEffect, useRef, useState } from "react";
import CharacterCard from "./ui/CharacterCard";

const PAGE_SIZE = 5;

interface Props {
	guildId: string;
	refreshToken?: number;
}

export default function ServerCharactersTab({ guildId, refreshToken = 0 }: Props) {
	const { t } = useI18n();
	const lastRefreshToken = useRef(refreshToken);
	const [characters, setCharacters] = useState<ApiCharacter[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");

	const load = useCallback(async () => {
		setError(null);
		try {
			const res = await charactersApi.getAllCharacters(guildId);
			setCharacters(res.data);
			setPage(1);
		} catch {
			setError(t("characters.loadError"));
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

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
				<CircularProgress />
			</Box>
		);
	}

	const q = search.trim().toLowerCase();
	const filtered = q
		? characters.filter(
				(c) => (c.charName ?? "").subText(q) || (c.ownerName ?? "").subText(q)
			)
		: characters;
	const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
	const pageChars = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	return (
		<Box>
			{/* Header : titre + recherche */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
					gridTemplateAreas: {
						xs: '"title" "search"',
						sm: '"title search"',
					},
					alignItems: "center",
					gap: 2,
					mb: 3,
				}}
			>
				<Typography
					variant="h5"
					fontWeight={600}
					sx={{ whiteSpace: "nowrap", gridArea: "title" }}
				>
					{t("characters.serverTitle")}
				</Typography>

				<TextField
					size="small"
					placeholder={t("characters.serverFilterPlaceholder")}
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
					sx={{
						gridArea: "search",
						width: { xs: "100%", sm: 320 },
						justifySelf: { xs: "stretch", sm: "end" },
					}}
				/>
			</Box>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{filtered.length === 0 ? (
				<Typography color="text.secondary">
					{q ? t("characters.noResults") : t("characters.noCharacters")}
				</Typography>
			) : (
				<>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
						{pageChars.map((char) => (
							<Box key={`${char.channelId}-${char.messageId}`}>
								{char.ownerName && (
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 0.5,
											mb: 0.5,
											px: 0.5,
										}}
									>
										<PersonIcon sx={{ fontSize: 14, color: "text.secondary" }} />
										<Typography
											variant="subtitle1"
											color="text.secondary"
											fontFamily={"var(--code-font-family)"}
										>
											{char.ownerName}
										</Typography>
									</Box>
								)}
								<CharacterCard char={char} />
							</Box>
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
