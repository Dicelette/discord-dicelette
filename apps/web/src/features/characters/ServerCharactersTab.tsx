import { charactersApi } from "@dicelette/api";
import PersonIcon from "@mui/icons-material/Person";
import { Box, Typography } from "@mui/material";
import { useI18n } from "@shared";
import { useCharactersList } from "./hooks/useCharactersList";
import CharacterCard from "./ui/CharacterCard";
import CharacterListLayout from "./ui/CharacterListLayout";

const PAGE_SIZE = 5;

interface Props {
	guildId: string;
	refreshToken?: number;
}

export default function ServerCharactersTab({ guildId, refreshToken = 0 }: Props) {
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
		charactersApi.getAllCharacters,
		refreshToken,
		t("characters.loadError")
	);

	const q = search.trim().toLowerCase();
	const filtered = q
		? characters.filter(
				(c) => (c.charName ?? "").subText(q) || (c.ownerName ?? "").subText(q)
			)
		: characters;
	const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
	const pageChars = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	return (
		<CharacterListLayout
			title={t("characters.serverTitle")}
			searchPlaceholder={t("characters.serverFilterPlaceholder")}
			showSearch={true}
			loading={loading}
			error={error}
			onCloseError={() => setError(null)}
			search={search}
			onSearchChange={handleSearchChange}
			page={page}
			onPageChange={setPage}
			pageChars={pageChars}
			totalPages={totalPages}
			emptyText={q ? t("characters.noResults") : t("characters.noCharacters")}
			renderCard={(char) => (
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
			)}
		/>
	);
}
