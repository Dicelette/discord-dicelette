import { charactersApi } from "@dicelette/api";
import { useI18n } from "@shared";
import { useCharacterPagination } from "./hooks/useCharacterPagination";
import { useCharactersList } from "./hooks/useCharactersList";
import CharacterCard from "./ui/CharacterCard";
import CharacterListLayout from "./ui/CharacterListLayout";

interface Props {
	guildId: string;
	refreshToken?: number;
}

export default function CharactersTab({ guildId, refreshToken = 0 }: Props) {
	const { t } = useI18n();

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
		refreshToken,
		t("characters.loadError")
	);

	const { pageChars, totalPages, query } = useCharacterPagination({
		characters,
		search,
		page,
	});

	return (
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
				<CharacterCard key={`${char.channelId}-${char.messageId}`} char={char} />
			)}
		/>
	);
}
