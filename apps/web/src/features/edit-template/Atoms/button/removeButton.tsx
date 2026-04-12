import { DeleteOutline } from "@mui/icons-material";
import { Box, Button, IconButton, Tooltip } from "@mui/material";
import { useI18n } from "@shared";
import type { FC } from "react";
import {
	DESKTOP_ACTION_WRAPPER_SX,
	MOBILE_ACTION_BUTTON_SX,
	TRANSPARENT_ICON_BUTTON_SX,
} from "../styles";

type RemoveButtonProps = {
	onClick: () => void;
};

const RemoveButton: FC<RemoveButtonProps> = ({ onClick }) => {
	const { t } = useI18n();
	const removeFieldLabel = t("template.removeField");

	return (
		<>
			<Button
				onClick={onClick}
				variant="contained"
				color="error"
				size="small"
				aria-label={removeFieldLabel}
				startIcon={<DeleteOutline fontSize="small" />}
				sx={MOBILE_ACTION_BUTTON_SX}
			>
				{t("template.delete")}
			</Button>
			<Box sx={DESKTOP_ACTION_WRAPPER_SX}>
				<Tooltip title={removeFieldLabel} arrow>
					<IconButton
						onClick={onClick}
						size="small"
						color="error"
						aria-label={removeFieldLabel}
						disableRipple
						sx={TRANSPARENT_ICON_BUTTON_SX}
					>
						<DeleteOutline />
					</IconButton>
				</Tooltip>
			</Box>
		</>
	);
};

export default RemoveButton;
