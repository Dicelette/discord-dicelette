import { DeleteOutline } from "@mui/icons-material";
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

type RemoveButtonProps = {
	onClick: () => void;
};

const buttonSx: SxProps<Theme> = { width: "100%", justifyContent: "flex-start" };
const iconButtonSx: SxProps<Theme> = {
	p: 0,
	borderRadius: 0,
	bgcolor: "transparent",
	"&:hover": { bgcolor: "transparent", opacity: 0.8 },
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
				sx={{ ...buttonSx, display: { xs: "flex", md: "none" } }}
			>
				{t("template.delete")}
			</Button>
			<Box sx={{ display: { xs: "none", md: "inline-flex" } }}>
				<Tooltip title={removeFieldLabel} arrow>
					<IconButton
						onClick={onClick}
						size="small"
						color="error"
						aria-label={removeFieldLabel}
						disableRipple
						sx={iconButtonSx}
					>
						<DeleteOutline />
					</IconButton>
				</Tooltip>
			</Box>
		</>
	);
};

export default RemoveButton;
