import { MenuItem, Select, type SxProps, type Theme } from "@mui/material";
import { type Locale, useI18n } from "../i18n";

interface Props {
	size?: "small" | "medium";
	sx?: SxProps<Theme>;
	variant?: "filled" | "outlined" | "standard";
}

export default function LanguageSelect({
	size = "small",
	sx,
	variant = "outlined",
}: Props) {
	const { locale, setLocale, t } = useI18n();

	const baseSx: SxProps<Theme> = {
		fontSize: "0.8rem",
		fontFamily: "var(--code-font-family)",
		minWidth: 50,
		"& .MuiSelect-select": { py: 0.5, px: 1.5 },
	};

	const mergedSx: SxProps<Theme> =
		sx === undefined ? baseSx : [baseSx, ...(Array.isArray(sx) ? sx : [sx])];

	return (
		<Select
			value={locale}
			onChange={(e) => setLocale(e.target.value as Locale)}
			size={size}
			variant={variant}
			inputProps={{ "aria-label": t("config.fields.lang") }}
			sx={mergedSx}
		>
			<MenuItem value="fr">FR</MenuItem>
			<MenuItem value="en">EN</MenuItem>
		</Select>
	);
}
