import { AddCircleOutline } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { FC } from "react";

type AddButtonProps = {
	len?: number;
	type?: "macro" | "stats" | "critical";
	onClick: () => void;
};

const AddButton: FC<AddButtonProps> = ({ len, type, onClick }) => {
	const maxLen = 25;
	const addLabel = type === "macro" ? "Ajouter une macro" : "Ajouter une statistique";
	const msg = type === "macro" ? "macros" : "statistiques (max 25)";
	const maxLabel = `Vous avez atteint le nombre maximum de ${msg}`;
	const isDisabled = type === "stats" && len !== undefined && len >= maxLen;

	return (
		<Tooltip title={isDisabled ? maxLabel : addLabel} arrow>
			<span>
				<IconButton
					onClick={onClick}
					size="small"
					color="success"
					disabled={isDisabled}
					sx={(theme) => ({
						border: `1px solid ${theme.palette.success.main}`,
						bgcolor: alpha(theme.palette.success.main, 0.12),
						"&:hover": {
							bgcolor: alpha(theme.palette.success.main, 0.2),
						},
					})}
				>
					<AddCircleOutline fontSize="small" />
				</IconButton>
			</span>
		</Tooltip>
	);
};

export default AddButton;
