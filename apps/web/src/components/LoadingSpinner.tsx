import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

export default function LoadingSpinner() {
	return (
		<Box className="min-h-screen flex items-center justify-center">
			<CircularProgress size={48} />
		</Box>
	);
}
