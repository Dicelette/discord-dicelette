import { ContentCopy } from "@mui/icons-material";
import { Button, IconButton, Tooltip } from "@mui/material";
import type { FC } from "react";
import { useCompact } from "../CompactContext";

type CopyButtonProps = {
	onClick: () => void;
	maxLen?: number;
	length?: number;
};

const CopyButton: FC<CopyButtonProps> = ({ onClick, maxLen, length }) => {
	const isNarrow = useCompact();
	const disabled = maxLen !== undefined && length !== undefined && length >= maxLen;

	return isNarrow ? (
		<Button
			onClick={onClick}
			variant="contained"
			color="info"
			size="small"
			disabled={disabled}
			aria-label="Dupliquer ce champ"
			startIcon={<ContentCopy fontSize="small" />}
			sx={{ width: "100%", justifyContent: "flex-start" }}
		>
			Dupliquer
		</Button>
	) : (
		<Tooltip title="Dupliquer ce champ" arrow>
			<span>
				<IconButton
					onClick={onClick}
					size="small"
					color="info"
					disabled={disabled}
					aria-label="Dupliquer ce champ"
					disableRipple
					sx={{
						p: 0,
						borderRadius: 0,
						bgcolor: "transparent",
						"&:hover": { bgcolor: "transparent", opacity: 0.8 },
					}}
				>
					<ContentCopy fontSize="small" />
				</IconButton>
			</span>
		</Tooltip>
	);
};

export default CopyButton;
