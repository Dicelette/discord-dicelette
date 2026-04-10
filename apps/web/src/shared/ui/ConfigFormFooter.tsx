import { keyframes } from "@emotion/react";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import SaveIcon from "@mui/icons-material/Save";
import { Button, IconButton, Paper, Slide, Tooltip, Typography } from "@mui/material";
import { useI18n } from "../i18n";

interface Props {
	isDirty: boolean;
	saving: boolean;
	onReset?: () => void;
}

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-7px); }
  40%       { transform: translateX(7px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
`;

const paperSx = {
	position: "fixed",
	top: 0,
	left: 0,
	right: 0,
	zIndex: 1300,
	py: 2,
	px: 3,
	borderRadius: 0,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 2,
	bgcolor: "var(--confirm-bgcolor)",
	color: "var(--confirm-color)",
	animation: `${shake} 0.45s ease`,
} as const;

const typographySx = {
	flexGrow: 1,
	textAlign: "center",
	color: "var(--confirm-color)",
	fontFamily: "var(--ifm-heading-font-family)",
	fontSize: { xs: "1rem", sm: "1.15rem" },
} as const;

const resetButtonSx = {
	fontFamily: "var(--ifm-font-family-base)",
	color: "var(--return-color)",
	bgcolor: "var(--return-bgcolor)",
	borderColor: "var(--return-bgcolor)",
	"&:hover": {
		bgcolor: "var(--return-bgcolor-hover)",
		borderColor: "var(--return-bgcolor-hover)",
	},
} as const;

const saveButtonSx = {
	bgcolor: "success.dark",
	color: "#fff",
	fontWeight: "bold",
	"&:hover": { bgcolor: "success.main" },
	"&.Mui-disabled": { bgcolor: "success.light", color: "grey.400" },
} as const;

const resetIconButtonSx = {
	color: "var(--return-color)",
	bgcolor: "var(--return-bgcolor)",
	borderRadius: 1,
	"&:hover": { bgcolor: "var(--return-bgcolor-hover)" },
} as const;

const saveIconButtonSx = {
	bgcolor: "success.dark",
	color: "#fff",
	borderRadius: 1,
	"&:hover": { bgcolor: "success.main" },
	"&.Mui-disabled": { bgcolor: "success.light", color: "grey.400" },
} as const;

export default function ConfigFormFooter({ isDirty, saving, onReset }: Props) {
	const { t } = useI18n();
	return (
		<Slide direction="down" in={isDirty} mountOnEnter unmountOnExit>
			<Paper elevation={8} sx={paperSx}>
				<Typography variant="h6" fontWeight="medium" sx={typographySx}>
					{t("config.unsaved")}
				</Typography>
				{onReset && (
					<>
						<Tooltip title={t("common.discard")}>
							<IconButton
								size="medium"
								type="button"
								onClick={onReset}
								sx={{ ...resetIconButtonSx, display: { xs: "inline-flex", md: "none" } }}
							>
								<RotateLeftIcon />
							</IconButton>
						</Tooltip>
						<Button
							variant="outlined"
							size="medium"
							type="button"
							onClick={onReset}
							sx={{ ...resetButtonSx, display: { xs: "none", md: "inline-flex" } }}
						>
							{t("common.discard")}
						</Button>
					</>
				)}
				<Tooltip title={saving ? t("common.saving") : t("common.save")}>
					<span style={{ display: "contents" }}>
						<IconButton
							type="submit"
							size="medium"
							disabled={saving}
							sx={{ ...saveIconButtonSx, display: { xs: "inline-flex", md: "none" } }}
						>
							<SaveIcon />
						</IconButton>
					</span>
				</Tooltip>
				<Button
					type="submit"
					variant="contained"
					size="medium"
					disabled={saving}
					sx={{ ...saveButtonSx, display: { xs: "none", md: "inline-flex" } }}
				>
					{saving ? t("common.saving") : t("common.save")}
				</Button>
			</Paper>
		</Slide>
	);
}
