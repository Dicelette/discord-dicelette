import { charactersApi } from "@dicelette/api";
import { Box } from "@mui/material";
import { AppTopBar, useI18n } from "@shared";
import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useCharacterPagination } from "../../features/characters/hooks/useCharacterPagination";
import { useCharactersList } from "../../features/characters/hooks/useCharactersList";
import CharacterCard from "../../features/characters/ui/CharacterCard";
import CharacterListLayout from "../../features/characters/ui/CharacterListLayout";

const mainSx = {
	maxWidth: "56rem",
	mx: "auto",
	px: { xs: 2, sm: 3 },
	py: 3,
	width: "100%",
} as const;

export default function CharPage() {
	const { t } = useI18n();
	const { guildId = "", userId = "" } = useParams<{ guildId: string; userId: string }>();

	const loadFn = useCallback(
		(gid: string) => charactersApi.getPublicCharacters(gid, userId),
		[userId]
	);

	const {
		characters,
		loading,
		error,
		setError,
		page,
		setPage,
		search,
		handleSearchChange,
	} = useCharactersList(guildId, loadFn, 0, t("characters.loadError"));

	const { pageChars, totalPages, query } = useCharacterPagination({
		characters,
		search,
		page,
	});

	const title = t("characters.publicTitle");

	return (
		<Box className="min-h-screen flex flex-col">
			<meta charSet="UTF-8" />
			<meta
				name="viewport"
				content="width=device-width, initial-scale=1.0, viewport-fit=cover"
			/>
			<title>{`Dicelette — ${title}`}</title>
			<AppTopBar />
			<Box component="main" className="flex-1" sx={mainSx}>
				<CharacterListLayout
					title={title}
					searchPlaceholder={t("characters.filterPlaceholder")}
					showSearch={characters.length > 0}
					loading={loading}
					error={error}
					onCloseError={() => setError(null)}
					search={search}
					onSearchChange={handleSearchChange}
					page={page}
					onPageChange={setPage}
					pageChars={pageChars}
					totalPages={totalPages}
					emptyText={query ? t("characters.noResults") : t("characters.noCharacters")}
					renderCard={(char) => (
						<CharacterCard key={`${char.channelId}-${char.messageId}`} char={char} />
					)}
				/>
			</Box>
		</Box>
	);
}
