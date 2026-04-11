import { keyframes } from "@emotion/react";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import SaveIcon from "@mui/icons-material/Save";
import {
	Alert,
	Box,
	Button,
	Fade,
	Paper,
	Snackbar,
	type SxProps,
	type Theme,
	Typography,
} from "@mui/material";
import TrapFocus from "@mui/material/Unstable_TrapFocus";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

interface Props {
	isDirty: boolean;
	saving: boolean;
	onReset?: () => void;
	saveSuccess?: boolean;
}

const shake = keyframes`
  0%, 100% { transform: translateX(-50%); }
  20%       { transform: translateX(calc(-50% - 5px)); }
  40%       { transform: translateX(calc(-50% + 5px)); }
  60%       { transform: translateX(calc(-50% - 3px)); }
  80%       { transform: translateX(calc(-50% + 3px)); }
`;

const paperSx: SxProps = {
	position: "fixed",
	bottom: "calc(16px + env(safe-area-inset-bottom))",
	left: "50%",
	transform: "translateX(-50%)",
	width: { xs: "calc(100% - 32px)", sm: "calc(100% - 48px)" },
	maxWidth: "58rem",
	zIndex: "appBar",
	borderRadius: 2,
	py: { xs: 1.5, md: 1 },
	px: { xs: 1.5, md: 3 },
	display: "flex",
	flexDirection: "row",
	alignItems: "center",
	justifyContent: "flex-start",
	gap: 1,
	bgcolor: "var(--confirm-bgcolor)",
	color: "var(--confirm-color)",
	animation: `${shake} 0.35s ease`,
} as const;

const typographySx: SxProps = {
	flexGrow: 1,
	flexShrink: 1,
	textAlign: "center",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	color: "var(--confirm-color)",
	fontFamily: "var(--ifm-heading-font-family)",
	fontSize: { xs: "0.9rem", sm: "1.15rem" },
} as const;

const buttonBoxSx: SxProps = {
	ml: "auto",
	display: "flex",
	alignItems: "center",
	gap: 1,
} as const;

const resetButtonSx: SxProps = {
	minWidth: { xs: 0, md: "auto" },
	px: { xs: 1.5, md: 1 },
	py: { xs: 1, md: 0.5 },
	fontSize: { xs: "0.9rem", md: "0.8rem" },
	"& .MuiButton-startIcon": { mr: { xs: 0, md: 1 } },
	fontFamily: "var(--ifm-font-family-base)",
	color: "var(--return-color)",
	bgcolor: "var(--return-bgcolor)",
	borderColor: "var(--return-bgcolor)",
	"&:hover": {
		bgcolor: "var(--return-bgcolor-hover)",
		borderColor: "var(--return-bgcolor-hover)",
	},
} as const;

const saveButtonSx: SxProps = {
	minWidth: { xs: 0, md: "auto" },
	px: { xs: 1.5, md: 1 },
	py: { xs: 1, md: 0.5 },
	fontSize: { xs: "0.9rem", md: "0.8rem" },
	"& .MuiButton-startIcon": { mr: { xs: 0, md: 1 } },
	bgcolor: "var(--save-bgcolor)",
	color: "var(--save-color)",
	fontWeight: "bold",
	"&:hover": { bgcolor: "var(--save-bgcolor-hover)" },
	"&.Mui-disabled": { bgcolor: "success.light", color: "grey.400" },
} as const;

const fadeBoxSx: SxProps<Theme> = {
	position: "fixed",
	bottom: 0,
	left: 0,
	right: 0,
	height: "calc(16px + env(safe-area-inset-bottom))",
	bgcolor: "background.default",
	zIndex: (theme) => theme.zIndex.appBar - 1,
	pointerEvents: "none",
} as const;

const labelSx = { display: { xs: "none", md: "inline-block" } } as const;

export default function ConfigFormFooter({
	isDirty,
	saving,
	onReset,
	saveSuccess,
}: Props) {
	const { t } = useI18n();
	const [saveOpen, setSaveOpen] = useState(false);
	const [discardOpen, setDiscardOpen] = useState(false);

	useEffect(() => {
		if (saveSuccess) setSaveOpen(true);
	}, [saveSuccess]);

	const handleReset = () => {
		onReset?.();
		setDiscardOpen(true);
	};

	const snackbarAnchor = { vertical: "top", horizontal: "right" } as const;

	return (
		<>
			<TrapFocus open={isDirty} disableAutoFocus disableEnforceFocus>
				<Fade in={isDirty} mountOnEnter unmountOnExit>
					<Paper
						elevation={8}
						sx={paperSx}
						role="dialog"
						aria-modal="false"
						aria-label={t("config.unsaved")}
						tabIndex={-1}
					>
						<Typography variant="h6" fontWeight="medium" sx={typographySx}>
							{t("config.unsaved")}
						</Typography>

						<Box sx={buttonBoxSx}>
							{onReset && (
								<Button
									variant="outlined"
									size="small"
									type="button"
									onClick={handleReset}
									startIcon={<RotateLeftIcon />}
									sx={resetButtonSx}
								>
									<Box component="span" sx={labelSx}>
										{t("common.discard")}
									</Box>
								</Button>
							)}

							<Button
								type="submit"
								variant="contained"
								size="small"
								disabled={saving}
								startIcon={<SaveIcon />}
								sx={saveButtonSx}
							>
								<Box component="span" sx={labelSx}>
									{saving ? t("common.saving") : t("common.save")}
								</Box>
							</Button>
						</Box>
					</Paper>
				</Fade>
			</TrapFocus>

			<Fade in={isDirty}>
				<Box aria-hidden="true" sx={fadeBoxSx} />
			</Fade>

			{isDirty && <Box sx={{ height: 72 }} aria-hidden="true" />}

			<Snackbar
				open={saveOpen}
				autoHideDuration={3000}
				onClose={() => setSaveOpen(false)}
				anchorOrigin={snackbarAnchor}
			>
				<Alert severity="success" onClose={() => setSaveOpen(false)}>
					{t("dashboard.saveSuccess")}
				</Alert>
			</Snackbar>

			<Snackbar
				open={discardOpen}
				autoHideDuration={3000}
				onClose={() => setDiscardOpen(false)}
				anchorOrigin={snackbarAnchor}
			>
				<Alert severity="warning" onClose={() => setDiscardOpen(false)}>
					{t("common.discardSuccess")}
				</Alert>
			</Snackbar>
		</>
	);
}
