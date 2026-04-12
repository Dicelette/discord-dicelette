import { DeleteOutline } from "@mui/icons-material";
import { Button, IconButton, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
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
			variant="contained"
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
				sx={(theme) => ({
					border: `1px solid ${theme.palette.error.main}`,
					bgcolor: alpha(theme.palette.error.main, 0.12),
					"&:hover": {
						bgcolor: alpha(theme.palette.error.main, 0.2),
					},
				})}
			>
				<DeleteOutline />
			</IconButton>
		</Tooltip>
	);
};

export default RemoveButton;
