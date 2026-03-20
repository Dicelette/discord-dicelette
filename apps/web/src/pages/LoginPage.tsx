import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

export default function LoginPage() {
	const handleLogin = () => {
		window.location.href = "/api/auth/discord";
	};

	return (
		<Box className="min-h-screen flex items-center justify-center p-4">
			<Card sx={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
				<CardContent className="p-8">
					<Typography variant="h3" gutterBottom sx={{ fontSize: "3rem" }}>
						🎲
					</Typography>
					<Typography variant="h5" gutterBottom fontWeight={700}>
						Dicelette Dashboard
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
						Connectez-vous avec Discord pour gérer la configuration de votre serveur.
					</Typography>
					<Button
						variant="contained"
						size="large"
						onClick={handleLogin}
						fullWidth
						sx={{
							backgroundColor: "#5865f2",
							"&:hover": { backgroundColor: "#4752c4" },
							py: 1.5,
							textTransform: "none",
							fontSize: "1rem",
						}}
					>
						Se connecter avec Discord
					</Button>
				</CardContent>
			</Card>
		</Box>
	);
}
