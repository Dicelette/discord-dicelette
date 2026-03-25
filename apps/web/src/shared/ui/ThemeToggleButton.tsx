import { DarkMode, LightMode } from "@mui/icons-material";
import { IconButton, type IconButtonProps, Tooltip, useColorScheme } from "@mui/material";
import { useI18n } from "../i18n";

type Props = Pick<IconButtonProps, "color" | "size" | "sx">;

export default function ThemeToggleButton({
	color = "inherit",
	size = "small",
	sx,
}: Props) {
	const { t } = useI18n();
	const { mode, setMode } = useColorScheme();
	const isDark = mode === "dark";
	const label = isDark ? t("common.lightTheme") : t("common.darkTheme");

	return (
		<Tooltip title={label}>
			<IconButton
				aria-label={label}
				color={color}
				onClick={() => setMode(isDark ? "light" : "dark")}
				size={size}
				sx={sx}
			>
				{isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
			</IconButton>
		</Tooltip>
	);
}
