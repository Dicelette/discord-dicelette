import RefreshIcon from "@mui/icons-material/Refresh";
import {
	Alert,
	Box,
	CircularProgress,
	IconButton,
	Pagination,
	Tooltip,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import type { ApiCharacter } from "../../lib/api";
import { charactersApi } from "../../lib/api";
import CharacterCard from "./CharacterCard";

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

	const totalPages = Math.ceil(characters.length / PAGE_SIZE);
	const pageChars = characters.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	return (
		<Box>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					mb: 3,
				}}
			>
				<Typography variant="h5" fontWeight={600}>
					{t("characters.title")}
				</Typography>
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

			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{characters.length === 0 ? (
				<Typography color="text.secondary">{t("characters.noCharacters")}</Typography>
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
