import { ContentCopy } from "@mui/icons-material";
import { Box, Button, IconButton, Tooltip } from "@mui/material";
import { useI18n } from "@shared";
import type { FC } from "react";
import {
	DESKTOP_ACTION_WRAPPER_SX,
	MOBILE_ACTION_BUTTON_SX,
	TRANSPARENT_ICON_BUTTON_SX,
} from "../styles";

type CopyButtonProps = {
	onClick: () => void;
	maxLen?: number;
	length?: number;
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
				sx={MOBILE_ACTION_BUTTON_SX}
			>
				{t("template.duplicate")}
			</Button>
			<Box sx={DESKTOP_ACTION_WRAPPER_SX}>
				<Tooltip title={copyFieldLabel} arrow>
					<span>
						<IconButton
							onClick={onClick}
							size="small"
							color="info"
							disabled={disabled}
							aria-label={copyFieldLabel}
							disableRipple
							sx={TRANSPARENT_ICON_BUTTON_SX}
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
