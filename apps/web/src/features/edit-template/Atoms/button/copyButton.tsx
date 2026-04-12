import { ContentCopy } from "@mui/icons-material";
import {
	Box,
	Button,
	IconButton,
	type SxProps,
	type Theme,
	Tooltip,
} from "@mui/material";
import { useI18n } from "@shared";
import type { FC } from "react";

type CopyButtonProps = {
	onClick: () => void;
	maxLen?: number;
	length?: number;
};

const buttonSx: SxProps<Theme> = { width: "100%", justifyContent: "flex-start" };
const iconButtonSx: SxProps<Theme> = {
	p: 0,
	borderRadius: 0,
	bgcolor: "transparent",
	"&:hover": { bgcolor: "transparent", opacity: 0.8 },
};

const CopyButton: FC<CopyButtonProps> = ({ onClick, maxLen, length }) => {
	const { t } = useI18n();
	const disabled = maxLen !== undefined && length !== undefined && length >= maxLen;
	const copyFieldLabel = t("template.duplicateField");

	return (
		<>
			<Button
				onClick={onClick}
				variant="contained"
				color="info"
				size="small"
				disabled={disabled}
				aria-label={copyFieldLabel}
				startIcon={<ContentCopy fontSize="small" />}
				sx={{ ...buttonSx, display: { xs: "flex", md: "none" } }}
			>
				{t("template.duplicate")}
			</Button>
			<Box sx={{ display: { xs: "none", md: "inline-flex" } }}>
				<Tooltip title={copyFieldLabel} arrow>
					<span>
						<IconButton
							onClick={onClick}
							size="small"
							color="info"
							disabled={disabled}
							aria-label={copyFieldLabel}
							disableRipple
							sx={iconButtonSx}
						>
							<ContentCopy fontSize="small" />
						</IconButton>
					</span>
				</Tooltip>
			</Box>
		</>
	);
};

export default CopyButton;
