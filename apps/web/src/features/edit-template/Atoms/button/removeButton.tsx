import { DeleteOutline } from "@mui/icons-material";
import { Button, IconButton, Tooltip } from "@mui/material";
import type { FC } from "react";
import { useCompact } from "../CompactContext";

type RemoveButtonProps = {
	onClick: () => void;
};

const RemoveButton: FC<RemoveButtonProps> = ({ onClick }) => {
	const isNarrow = useCompact();

	return isNarrow ? (
		<Button
			onClick={onClick}
			variant="outlined"
			color="error"
			size="small"
			aria-label="Supprimer ce champ"
			startIcon={<DeleteOutline fontSize="small" />}
			sx={{ width: "100%", justifyContent: "flex-start" }}
		>
			Supprimer
		</Button>
	) : (
		<Tooltip title="Supprimer ce champ" arrow>
			<IconButton
				onClick={onClick}
				size="small"
				color="error"
				aria-label="Supprimer ce champ"
			>
				<DeleteOutline />
			</IconButton>
		</Tooltip>
	);
};

export default RemoveButton;
