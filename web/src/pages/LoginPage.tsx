import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { type Locale, useI18n } from "../i18n";

export default function LoginPage() {
	const { locale, setLocale, t } = useI18n();

	const handleLogin = () => {
		window.location.href = "/api/auth/discord";
	};

	return (
		<Box
			className="min-h-screen flex items-center justify-center p-4"
			sx={{ position: "relative" }}
		>
			<Box sx={{ position: "absolute", top: 16, right: 16 }}>
				<Select
					value={locale}
					onChange={(e) => setLocale(e.target.value as Locale)}
					size="small"
					variant="outlined"
					sx={{
						fontSize: "0.8rem",
						fontFamily: '"Iosevka Charon", monospace',
						"& .MuiSelect-select": { py: 0.5, px: 1.5 },
					}}
				>
					<MenuItem value="fr">FR</MenuItem>
					<MenuItem value="en">EN</MenuItem>
				</Select>
			</Box>

			<Card sx={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
				<CardContent className="p-8">
					<Box sx={{ mb: 2 }}>
						<img
							src="/logo.png"
							alt="Dicelette"
							style={{ height: 72, width: 72, objectFit: "contain" }}
						/>
					</Box>
					<Typography variant="h5" gutterBottom fontWeight={700}>
						{t("login.title")}
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
						{t("login.subtitle")}
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
						{t("login.button")}
					</Button>
				</CardContent>
			</Card>
		</Box>
	);
}
