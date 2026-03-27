import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { DocsButton, LanguageSelect, ThemeToggleButton, useI18n } from "@shared";

export default function Login() {
	const { t } = useI18n();

	const handleLogin = () => {
		window.location.href = "/api/auth/discord";
	};

	return (
		<Box className="min-h-screen flex flex-col">
			<Box sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } }}>
				<Box
					sx={{
						width: "100%",
						maxWidth: "none",
						mx: 0,
						display: "flex",
						justifyContent: "flex-end",
						alignItems: "center",
						gap: 1,
						flexWrap: "wrap",
					}}
				>
					<DocsButton color="default" />
					<ThemeToggleButton color="default" />
					<LanguageSelect />
				</Box>
			</Box>

			<Box
				className="flex-1 flex items-center justify-center"
				sx={{ px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 6 } }}
			>
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
		</Box>
	);
}
