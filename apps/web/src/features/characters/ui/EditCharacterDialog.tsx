import type { ApiCharacter } from "@dicelette/api";
import { charactersApi } from "@dicelette/api";
import EditIcon from "@mui/icons-material/Edit";
import {
	Alert,
	Button,
	Checkbox,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	TextField,
} from "@mui/material";
import { useI18n } from "@shared";
import { useState } from "react";

interface Props {
	character: ApiCharacter;
	onSuccess: () => void;
}

export default function EditCharacterDialog({ character, onSuccess }: Props) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	const [charName, setCharName] = useState(character.charName ?? "");
	const [isPrivate, setIsPrivate] = useState(character.isPrivate);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSave = async () => {
		setLoading(true);
		setError(null);

		try {
			const guildId = character.discordLink.split("/")[4];
			await charactersApi.editCharacter(guildId, character.messageId, {
				charName: charName || undefined,
				isPrivate,
			});
			onSuccess();
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Edit failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Button
				size="small"
				startIcon={<EditIcon />}
				onClick={() => setOpen(true)}
				disabled={loading}
			>
				{t("common.edit")}
			</Button>

			<Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>{t("characters.editTitle")}</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
					{error && <Alert severity="error">{error}</Alert>}

					<TextField
						label={t("characters.name")}
						value={charName}
						onChange={(e) => setCharName(e.target.value)}
						disabled={loading}
						fullWidth
					/>

					<FormControlLabel
						control={
							<Checkbox
								checked={isPrivate}
								onChange={(e) => setIsPrivate(e.target.checked)}
							/>
						}
						label={t("characters.isPrivate")}
						disabled={loading}
					/>

					{loading && <CircularProgress size={24} />}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)} disabled={loading}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSave} variant="contained" disabled={loading}>
						{t("common.save")}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
