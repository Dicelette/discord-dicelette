import DarkModeIcon from "@mui/icons-material/DarkMode";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useColorScheme } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { type Locale, useI18n } from "../../i18n";
import UserAvatarMenu from "./UserAvatarMenu";

export default function Layout() {
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
				<Toolbar sx={{ gap: 2, backgroundColor: "var(--appbar-bg)" }}>
					<Box className="flex items-center gap-2" sx={{ flexGrow: 1 }}>
						<img src="/logo.png" alt="Dicelette" style={{ height: 28, width: 28 }} />
						<Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
							{t("login.title")}
						</Typography>
					</Box>

					<Tooltip title={t("common.documentation")}>
						<IconButton
							color="inherit"
							onClick={() => window.open("https://www.dicelette.app", "_blank")}
							size="small"
						>
							<LibraryBooksIcon fontSize="small" />
						</IconButton>
					</Tooltip>

					<Tooltip
						title={mode === "dark" ? t("common.lightTheme") : t("common.darkTheme")}
					>
						<IconButton color="inherit" onClick={toggleMode} size="small">
							{mode === "dark" ? (
								<LightModeIcon fontSize="small" />
							) : (
								<DarkModeIcon fontSize="small" />
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
