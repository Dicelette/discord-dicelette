import { LibraryBooks } from "@mui/icons-material";
import { IconButton, type IconButtonProps, Tooltip } from "@mui/material";
import { appConfig } from "../config";
import { useI18n } from "../i18n";

type Props = Pick<IconButtonProps, "color" | "size" | "sx">;

export default function DocsButton({ color = "inherit", size = "small", sx }: Props) {
	const { t } = useI18n();
	const label = t("common.documentation");

	return (
		<Tooltip title={label}>
			<IconButton
				aria-label={label}
				color={color}
				onClick={() => window.open(appConfig.docsUrl, "_blank", "noopener,noreferrer")}
				size={size}
				sx={sx}
			>
				<LibraryBooks fontSize="small" />
			</IconButton>
		</Tooltip>
	);
}
