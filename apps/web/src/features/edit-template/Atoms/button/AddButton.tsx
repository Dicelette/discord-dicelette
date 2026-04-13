import { AddCircleOutline } from "@mui/icons-material";
import { Button, Tooltip } from "@mui/material";
import { useI18n } from "@shared";
import type { FC } from "react";

type AddButtonProps = {
	len: number;
	type: "macro" | "stats" | "critical";
	onClick: () => void;
};

const AddButton: FC<AddButtonProps> = ({ len, type, onClick }) => {
	const { t } = useI18n();
	const maxLen = type === "critical" ? 22 : 25;
	const addLabel = t("template.add.label");
	const maxLabel = t("template.add.max", { maxLen });
	const isDisabled = len >= maxLen;

	return (
		<Tooltip title={isDisabled ? maxLabel : undefined} arrow>
			<span>
				<Button
					onClick={onClick}
					size="small"
					color="success"
					variant="outlined"
					disabled={isDisabled}
					sx={{ mb: 2 }}
					startIcon={<AddCircleOutline />}
				>
					{addLabel}
				</Button>
			</span>
		</Tooltip>
	);
};

export default AddButton;
