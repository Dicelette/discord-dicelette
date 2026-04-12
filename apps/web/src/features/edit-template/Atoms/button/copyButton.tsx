import { ContentCopy } from "@mui/icons-material";
import { Button, IconButton, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
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
					sx={(theme) => ({
						border: `1px solid ${theme.palette.info.main}`,
						bgcolor: alpha(theme.palette.info.main, 0.12),
						"&:hover": {
							bgcolor: alpha(theme.palette.info.main, 0.2),
						},
					})}
				>
					<ContentCopy fontSize="small" />
				</IconButton>
			</span>
		</Tooltip>
	);
};

export default CopyButton;
