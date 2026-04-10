import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { DocsButton, LanguageSelect, ThemeToggleButton, useI18n } from "@shared";

const headerBoxSx = { px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } } as const;
const toolbarBoxSx = {
	width: "100%",
	maxWidth: "none",
	mx: 0,
	display: "flex",
	justifyContent: "flex-end",
	alignItems: "center",
	gap: 1,
	flexWrap: "wrap",
} as const;
const mainBoxSx = { px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 6 } } as const;
const loginCardSx = { maxWidth: 400, width: "100%", textAlign: "center" } as const;
const logoBoxSx = {
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 1.5,
	mb: 2,
} as const;
const subtitleSx = { mb: 4 } as const;
const loginButtonSx = { py: 1.5, textTransform: "none", fontSize: "1rem" } as const;

export default function Login() {
	const { t } = useI18n();

	const handleLogin = () => {
		window.location.href = "/api/auth/discord";
	};

	return (
		<Box className="min-h-screen flex flex-col">
			<Box sx={headerBoxSx}>
				<Box sx={toolbarBoxSx}>
					<DocsButton color="default" />
					<ThemeToggleButton color="default" />
					<LanguageSelect />
				</Box>
			</Box>

			<Box
				className="flex-1 flex items-center justify-center"
				sx={mainBoxSx}
			>
				<Card sx={loginCardSx}>
					<CardContent className="p-8">
						<Box sx={logoBoxSx}>
							<img
								src="/logo.png"
								alt="Dicelette"
								style={{ height: 48, width: 48, objectFit: "contain" }}
							/>
							<Typography variant="h5" fontWeight={700}>
								{t("login.title")}
							</Typography>
						</Box>
						<Typography variant="body2" color="text.secondary" sx={subtitleSx}>
							{t("login.subtitle")}
						</Typography>
						<Button
							variant="contained"
							size="large"
							onClick={handleLogin}
							fullWidth
							sx={loginButtonSx}
						>
							{t("login.button")}
						</Button>
					</CardContent>
				</Card>
			</Box>
		</Box>
	);
}
