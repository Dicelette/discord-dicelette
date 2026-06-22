import { Icon } from "@iconify/react";
import { IconButton, type IconButtonProps, Tooltip } from "@mui/material";
import { useI18n } from "../i18n";

type Props = Pick<IconButtonProps, "color" | "size" | "sx">;

export default function PlaygroundButton({
	color = "inherit",
	size = "small",
	sx,
}: Props) {
	const { t } = useI18n();
	const label = t("playground.title");

	const playgroundUrl = import.meta.env.DEV
		? "/playground"
		: "https://playground.dicelette.app";

	return (
		<Tooltip title={label}>
			<IconButton
				aria-label={label}
				size={size}
				sx={sx}
				color={color}
				onClick={() => window.open(playgroundUrl, "_blank", "noopener,noreferrer")}
			>
				<Icon icon="tabler:sandbox" height="20" />
			</IconButton>
		</Tooltip>
	);
}
