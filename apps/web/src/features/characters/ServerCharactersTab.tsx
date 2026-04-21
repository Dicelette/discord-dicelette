import type { ApiCharacter } from "@dicelette/api";
import { charactersApi } from "@dicelette/api";
import { Upload } from "@mui/icons-material";
import PersonIcon from "@mui/icons-material/Person";
import { Box, Button, Typography } from "@mui/material";
import { useI18n } from "@shared";
import { useState } from "react";
import { useCharacterPagination } from "./hooks/useCharacterPagination";
import { useCharactersList } from "./hooks/useCharactersList";
import CharacterCard from "./ui/CharacterCard";
import CharacterListLayout from "./ui/CharacterListLayout";
import ImportCsv from "./ui/ImportCsv";

const ownerLabelBoxSx = {
	display: "flex",
	alignItems: "center",
	gap: 0.5,
	mb: 0.5,
	px: 0.5,
} as const;
const ownerIconSx = { fontSize: 18, color: "text.secondary" } as const;

interface Props {
	guildId: string;
	refreshToken?: number;
}

export default function ServerCharactersTab({ guildId, refreshToken = 0 }: Props) {
	const { t } = useI18n();
	const [importRefreshTrigger, setImportRefreshTrigger] = useState(0);
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
		refreshToken + importRefreshTrigger,
		t("characters.loadError")
	);

	const { pageChars, totalPages, query } = useCharacterPagination({
		characters,
		search,
		page,
		filterFn: (char: ApiCharacter, q: string) =>
			(char.charName ?? "").subText(q) || (char.ownerName ?? "").subText(q),
	});

	const handleExportCharacters = async () => {
		try {
			const res = await charactersApi.exportCsv(guildId);
			const url = URL.createObjectURL(res.data);
			const a = document.createElement("a");
			a.href = url;
			a.download = "characters.csv";
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Export failed:", err);
		}
	};

	const actions = (
		<>
			<ImportCsv
				guildId={guildId}
				onSuccess={() => setImportRefreshTrigger((prev) => prev + 1)}
			/>
			{characters.length > 0 && (
				<Button
					variant="outlined"
					startIcon={<Upload />}
					onClick={handleExportCharacters}
				>
					{t("template.exportCharacters")}
				</Button>
			)}
		</>
	);

	return (
		<CharacterListLayout
			actions={actions}
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
			emptyText={query ? t("characters.noResults") : t("characters.noCharacters")}
			renderCard={(char) => (
				<Box key={`${char.channelId}-${char.messageId}`}>
					{char.ownerName && (
						<Box sx={ownerLabelBoxSx}>
							<PersonIcon sx={ownerIconSx} />
							<Typography
								variant="subtitle1"
								sx={{
									color: "text.secondary",
									fontFamily: "var(--code-font-family)",
								}}
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
