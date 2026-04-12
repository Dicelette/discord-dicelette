import { AddCircleOutline } from "@mui/icons-material";
import { IconButton, type SxProps, type Theme, Tooltip } from "@mui/material";
import { useI18n } from "@shared";
import type { FC } from "react";

type AddButtonProps = {
	len?: number;
	type?: "macro" | "stats" | "critical";
	onClick: () => void;
};

const buttonSx: SxProps<Theme> = {
	p: 0,
	borderRadius: 0,
	bgcolor: "transparent",
	"&:hover": { bgcolor: "transparent", opacity: 0.8 },
};

const AddButton: FC<AddButtonProps> = ({ len, type, onClick }) => {
	const { t } = useI18n();
	const maxLen = 25;
	const addLabel = type === "macro" ? t("template.addMacro") : t("template.addStatistic");
	const maxLabel =
		type === "macro"
			? t("template.maxMacrosReached")
			: t("template.maxStatisticsReached", { max: maxLen });
	const isDisabled = type === "stats" && len !== undefined && len >= maxLen;

	return (
		<Tooltip title={isDisabled ? maxLabel : addLabel} arrow>
			<span>
				<IconButton
					onClick={onClick}
					size="small"
					color="success"
					disabled={isDisabled}
					disableRipple
					sx={buttonSx}
				>
					<AddCircleOutline fontSize="small" />
				</IconButton>
			</span>
		</Tooltip>
	);
};

export default AddButton;
