import { Dashboard } from "@mui/icons-material";
import { IconButton, type IconButtonProps, Tooltip } from "@mui/material";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

type Props = Pick<IconButtonProps, "color" | "size" | "sx">;

/** Small icon button back to the dashboard home, for standalone public pages. */
export default function BackToDashboardButton({
	color = "inherit",
	size = "small",
	sx,
}: Props) {
	const { t } = useI18n();
	const label = t("characters.backToDashboard");

	return (
		<Tooltip title={label}>
			<IconButton
				component={Link}
				to="/"
				aria-label={label}
				color={color}
				size={size}
				sx={sx}
			>
				<Dashboard fontSize="small" />
			</IconButton>
		</Tooltip>
	);
}
