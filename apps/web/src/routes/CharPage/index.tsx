import { charactersApi } from "@dicelette/api";
import { Box, Stack, Typography } from "@mui/material";
import { LanguageSelect, ThemeToggleButton, useI18n } from "@shared";
import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useCharacterPagination } from "../../features/characters/hooks/useCharacterPagination";
import { useCharactersList } from "../../features/characters/hooks/useCharactersList";
import CharacterCard from "../../features/characters/ui/CharacterCard";
import CharacterListLayout from "../../features/characters/ui/CharacterListLayout";
import DashboardButton from "../Playground/DashboardButton.tsx";
import {
	headerBoxSx,
	logoBoxSx,
	mainBoxSx,
	stackSx,
	toolbarBoxSx,
} from "../Playground/styles";

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
			<Box sx={headerBoxSx}>
				<Box sx={toolbarBoxSx}>
					<DashboardButton />
					<ThemeToggleButton color="default" />
					<LanguageSelect />
				</Box>
			</Box>
			<Box sx={mainBoxSx}>
				<Stack spacing={3} sx={stackSx}>
					<Box sx={logoBoxSx}>
						<img
							src="/logo.png"
							alt="Dicelette"
							style={{ height: 40, width: 40, objectFit: "contain" }}
						/>
						<Typography variant="h5" sx={{ fontWeight: 700 }}>
							Dicelette
						</Typography>
					</Box>
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
				</Stack>
			</Box>
		</Box>
	);
}
