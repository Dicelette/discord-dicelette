import type { ApiKarmaEntry } from "@dicelette/api";
import { karmaApi } from "@dicelette/api";
import { RestartAlt } from "@mui/icons-material";
import {
	Autocomplete,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Paper,
	TextField,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { useState } from "react";
import { useToast } from "../../../providers";

const panelPaperSx = { p: 3, mb: 3 } as const;
const controlsRowSx = {
	display: "flex",
	alignItems: "stretch",
	gap: 1.5,
	mt: 1.5,
	flexWrap: "wrap",
} as const;
const searchFieldSx = { flex: "1 1 240px", minWidth: 200 } as const;
const buttonSx = { flexShrink: 0 } as const;
const selfButtonSx = { mb: 3 } as const;

interface Props {
	guildId: string;
	isAdmin: boolean;
	users: ApiKarmaEntry[];
	onReset: () => void;
}

export default function KarmaResetPanel({ guildId, isAdmin, users, onReset }: Props) {
	const { t } = useI18n();
	const { enqueueToast } = useToast();
	const [target, setTarget] = useState<ApiKarmaEntry | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [resetting, setResetting] = useState(false);

	const targetName = target?.displayName ?? target?.userId ?? null;

	const handleConfirm = async () => {
		setResetting(true);
		try {
			if (isAdmin && target) {
				await karmaApi.resetUser(guildId, target.userId);
			} else {
				await karmaApi.resetSelf(guildId);
			}
			enqueueToast(t("karma.reset.success"));
			setConfirmOpen(false);
			setTarget(null);
			onReset();
		} catch {
			enqueueToast(t("karma.reset.error"), "error");
		} finally {
			setResetting(false);
		}
	};

	const confirmDialog = (
		<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
			<DialogTitle>{t("karma.reset.confirmTitle")}</DialogTitle>
			<DialogContent>
				<Typography>
					{isAdmin && targetName
						? t("karma.reset.confirmBodyUser", { name: targetName })
						: t("karma.reset.confirmBodySelf")}
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setConfirmOpen(false)} disabled={resetting}>
					{t("common.cancel")}
				</Button>
				<Button
					color="error"
					variant="contained"
					onClick={handleConfirm}
					disabled={resetting}
				>
					{t("karma.reset.confirmButton")}
				</Button>
			</DialogActions>
		</Dialog>
	);

	if (!isAdmin) {
		return (
			<>
				<Button
					sx={selfButtonSx}
					size="large"
					variant="outlined"
					color="error"
					startIcon={<RestartAlt />}
					onClick={() => setConfirmOpen(true)}
				>
					{t("karma.reset.button")}
				</Button>
				{confirmDialog}
			</>
		);
	}

	return (
		<Paper variant="outlined" sx={panelPaperSx}>
			<Typography variant="h6" sx={{ fontWeight: 600 }}>
				{t("karma.reset.title")}
			</Typography>
			<Box sx={controlsRowSx}>
				<Autocomplete
					sx={searchFieldSx}
					size="small"
					options={users}
					getOptionLabel={(u) => u.displayName ?? u.userId}
					isOptionEqualToValue={(a, b) => a.userId === b.userId}
					value={target}
					onChange={(_e, newValue) => setTarget(newValue)}
					renderInput={(params) => (
						<TextField {...params} label={t("karma.reset.searchLabel")} />
					)}
				/>
				<Button
					sx={buttonSx}
					variant="outlined"
					color="error"
					startIcon={<RestartAlt />}
					disabled={!target}
					onClick={() => setConfirmOpen(true)}
				>
					{t("karma.reset.button")}
				</Button>
			</Box>
			{confirmDialog}
		</Paper>
	);
}
