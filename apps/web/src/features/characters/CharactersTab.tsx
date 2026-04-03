import { charactersApi } from "@dicelette/api";
import { useI18n } from "@shared";
import { useCharactersList } from "./hooks/useCharactersList";
import CharacterCard from "./ui/CharacterCard";
import CharacterListLayout from "./ui/CharacterListLayout";

const PAGE_SIZE = 5;

interface Props {
	guildId: string;
	refreshToken?: number;
}

export default function CharactersTab({ guildId, refreshToken = 0 }: Props) {
	const { t } = useI18n();
	const { characters, loading, error, setError, page, setPage, search, handleSearchChange } =
		useCharactersList(guildId, charactersApi.getCharacters, refreshToken, t("characters.loadError"));

	const q = search.trim().toLowerCase();
	const filtered = q
		? characters.filter((c) => (c.charName ?? "").toLowerCase().includes(q))
		: characters;
	const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
	const pageChars = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
			emptyText={search.trim() ? t("characters.noResults") : t("characters.noCharacters")}
			renderCard={(char) => (
				<CharacterCard key={`${char.channelId}-${char.messageId}`} char={char} />
			)}
		/>
	);
}
