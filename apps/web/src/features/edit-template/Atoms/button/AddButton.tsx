import { AddCircleOutline } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
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
					disableRipple
					sx={{
						p: 0,
						borderRadius: 0,
						bgcolor: "transparent",
						"&:hover": { bgcolor: "transparent", opacity: 0.8 },
					}}
				>
					<AddCircleOutline fontSize="small" />
				</IconButton>
			</span>
		</Tooltip>
	);
};

export default AddButton;
