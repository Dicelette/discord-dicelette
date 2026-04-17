import { charactersApi } from "@dicelette/api";
import { Box } from "@mui/material";
import { useI18n } from "@shared";
import { useState } from "react";
import { useCharacterPagination } from "./hooks/useCharacterPagination";
import { useCharactersList } from "./hooks/useCharactersList";
import CharacterCard from "./ui/CharacterCard";
import CharacterListLayout from "./ui/CharacterListLayout";
import ImportCsv from "./ui/ImportCsv";

interface Props {
	guildId: string;
	refreshToken?: number;
}

export default function CharactersTab({ guildId, refreshToken = 0 }: Props) {
	const { t } = useI18n();
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	const {
		characters,
		loading,
		error,
		setError,
		page,
		setPage,
		search,
		handleSearchChange,
	} = useCharactersList(
		guildId,
		charactersApi.getCharacters,
		refreshToken + refreshTrigger,
		t("characters.loadError")
	);

	const { pageChars, totalPages, query } = useCharacterPagination({
		characters,
		search,
		page,
	});

	const handleRefresh = () => {
		setRefreshTrigger((prev) => prev + 1);
	};

	return (
		<Box>
			<Box sx={{ display: "flex", gap: 1, mb: 2 }}>
				<ImportCsv guildId={guildId} onSuccess={handleRefresh} />
			</Box>

			<CharacterListLayout
				title={t("characters.title")}
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
					<CharacterCard
						key={`${char.channelId}-${char.messageId}`}
						char={char}
						onEdit={handleRefresh}
					/>
				)}
			/>
		</Box>
	);
}
