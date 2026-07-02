import DashboardIcon from "@mui/icons-material/Dashboard";
import { IconButton, type IconButtonProps, Tooltip } from "@mui/material";
import { useI18n } from "../../shared";

type Props = Pick<IconButtonProps, "color" | "size" | "sx">;

export default function DashboardButton({
	color = "inherit",
	size = "small",
	sx,
}: Props) {
	const { t } = useI18n();
	const label = t("info.dashboard");
	const dashboardUrl = import.meta.env.DEV ? "/" : "https://dashboard.dicelette.app";
	return (
		<Tooltip title={label}>
			<IconButton
				aria-label={label}
				color={color}
				onClick={() => window.open(dashboardUrl, "_blank", "noopener,noreferrer")}
				size={size}
				sx={sx}
			>
				<DashboardIcon fontSize="small" />
			</IconButton>
		</Tooltip>
	);
}
