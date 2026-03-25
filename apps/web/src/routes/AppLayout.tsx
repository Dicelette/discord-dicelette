import { DarkMode, LibraryBooks, LightMode } from "@mui/icons-material";
import {
	AppBar,
	Box,
	Button,
	IconButton,
	MenuItem,
	Select,
	Toolbar,
	Tooltip,
	Typography,
	useColorScheme,
} from "@mui/material";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../providers";
import { type Locale, UserAvatarMenu, useI18n } from "../shared";

export default function AppLayout() {
	const { user, logout } = useAuth();
	const { locale, setLocale, t } = useI18n();
	const { mode, setMode } = useColorScheme();
	const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");

	const avatarUrl = user?.avatar
		? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
		: "https://cdn.discordapp.com/embed/avatars/0.png";

	return (
		<Box className="min-h-screen flex flex-col">
			<AppBar
				position="static"
				elevation={0}
				sx={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
			>
				<Toolbar sx={{ gap: { xs: 1, sm: 2 }, backgroundColor: "var(--appbar-bg)" }}>
					<Button
						component={Link}
						to="/"
						color="inherit"
						sx={{ textTransform: "none", gap: 1, flexGrow: 0, minWidth: 0 }}
					>
						<img
							src="/logo.png"
							alt="Dicelette"
							style={{ height: 28, width: 28, flexShrink: 0 }}
						/>
						<Typography
							variant="h6"
							component="span"
							sx={{ fontWeight: 700, display: { xs: "none", sm: "block" } }}
						>
							{t("login.title")}
						</Typography>
					</Button>
					<Box sx={{ flexGrow: 1 }} />

					<Tooltip title={t("info.docs")}>
						<IconButton
							color="inherit"
							onClick={() => window.open("https://www.dicelette.app", "_blank")}
							size="small"
						>
							<LibraryBooks fontSize="small" />
						</IconButton>
					</Tooltip>

					<Tooltip
						title={mode === "dark" ? t("common.lightTheme") : t("common.darkTheme")}
					>
						<IconButton color="inherit" onClick={toggleMode} size="small">
							{mode === "dark" ? (
								<LightMode fontSize="small" />
							) : (
								<DarkMode fontSize="small" />
							)}
						</IconButton>
					</Tooltip>

					<Select
						value={locale}
						onChange={(e) => setLocale(e.target.value as Locale)}
						size="small"
						variant="outlined"
						sx={{
							color: "inherit",
							fontSize: "0.8rem",
							fontFamily: "var(--code-font-family)",
							"& .MuiOutlinedInput-notchedOutline": {
								borderColor: "rgba(255,255,255,0.2)",
							},
							"& .MuiSvgIcon-root": { color: "inherit" },
							"& .MuiSelect-select": { py: 0.5, px: 1.5 },
						}}
					>
						<MenuItem value="fr">FR</MenuItem>
						<MenuItem value="en">EN</MenuItem>
					</Select>

					{user && (
						<UserAvatarMenu
							username={user.global_name ?? user.username}
							avatarUrl={avatarUrl}
							onLogout={logout}
						/>
					)}
				</Toolbar>
			</AppBar>
			<Box component="main" className="flex-1">
				<Outlet />
			</Box>
		</Box>
	);
}
