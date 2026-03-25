import {
	Box,
	Button,
	Card,
	CardContent,
	MenuItem,
	Select,
	Typography,
} from "@mui/material";
import { type Locale, useI18n } from "../shared";

export default function Login() {
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
						fontFamily: "var(--code-font-family)",
						"& .MuiSelect-select": { py: 0.5, px: 1.5 },
					}}
				>
					<MenuItem value="fr">FR</MenuItem>
					<MenuItem value="en">EN</MenuItem>
				</Select>
			</Box>

			<Card sx={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
				<CardContent className="p-8">
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 1.5,
							mb: 2,
						}}
					>
						<img
							src="/logo.png"
							alt="Dicelette"
							style={{ height: 48, width: 48, objectFit: "contain" }}
						/>
						<Typography variant="h5" fontWeight={700}>
							{t("login.title")}
						</Typography>
					</Box>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
						{t("login.subtitle")}
					</Typography>
					<Button
						variant="contained"
						size="large"
						onClick={handleLogin}
						fullWidth
						sx={{
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
