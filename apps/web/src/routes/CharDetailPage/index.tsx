import { charactersApi } from "@dicelette/api";
import { ArrowBack } from "@mui/icons-material";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { AppTopBar, DocsButton, PlaygroundButton, useI18n } from "@shared";
import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useCharactersList } from "../../features/characters/hooks/useCharactersList";
import { matchesCharSlug } from "../../features/characters/shareLink";
import CharacterCard from "../../features/characters/ui/CharacterCard";

const mainSx = {
	maxWidth: "56rem",
	mx: "auto",
	px: { xs: 2, sm: 3 },
	py: 3,
	width: "100%",
} as const;
const loadingBoxSx = { display: "flex", justifyContent: "center", p: 6 } as const;
const backButtonSx = { mb: 3 } as const;

export default function CharDetailPage() {
	const { t } = useI18n();
	const {
		guildId = "",
		userId = "",
		charName: charSlug = "",
	} = useParams<{ guildId: string; userId: string; charName: string }>();

	const loadFn = useCallback(
		(gid: string) => charactersApi.getPublicCharacters(gid, userId),
		[userId]
	);

	const { characters, loading, error } = useCharactersList(
		guildId,
		loadFn,
		0,
		t("characters.loadError")
	);

	const char = characters.find((c) => matchesCharSlug(c.charName, charSlug));
	const title = char?.charName ?? t("characters.publicTitle");

	return (
		<Box className="min-h-screen flex flex-col">
			<meta charSet="UTF-8" />
			<meta
				name="viewport"
				content="width=device-width, initial-scale=1.0, viewport-fit=cover"
			/>
			<title>{`Dicelette — ${title}`}</title>
			<AppTopBar
				leadingNav={
					<>
						<DocsButton />
						<PlaygroundButton />
					</>
				}
			/>
			<Box component="main" className="flex-1" sx={mainSx}>
				<Button
					component={Link}
					to={`/char/${guildId}/${userId}`}
					startIcon={<ArrowBack />}
					sx={backButtonSx}
				>
					{t("characters.backToList")}
				</Button>
				{loading ? (
					<Box sx={loadingBoxSx}>
						<CircularProgress />
					</Box>
				) : error ? (
					<Alert severity="error">{error}</Alert>
				) : char ? (
					<CharacterCard char={char} />
				) : (
					<Alert severity="info">{t("characters.notFound")}</Alert>
				)}
			</Box>
		</Box>
	);
}
