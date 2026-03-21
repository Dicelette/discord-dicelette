import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useI18n, type Locale } from "../i18n";

export default function Layout() {
	const { user, logout } = useAuth();
	const { locale, setLocale, t } = useI18n();

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
				<Toolbar sx={{ gap: 2 }}>
					<Box className="flex items-center gap-2" sx={{ flexGrow: 1 }}>
						<img src="/logo.png" alt="Dicelette" style={{ height: 28, width: 28 }} />
						<Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
							Dicelette Dashboard
						</Typography>
					</Box>

					<Select
						value={locale}
						onChange={(e) => setLocale(e.target.value as Locale)}
						size="small"
						variant="outlined"
						sx={{
							color: "inherit",
							fontSize: "0.8rem",
							fontFamily: '"Iosevka Charon", monospace',
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
						<Box className="flex items-center gap-2">
							<Avatar src={avatarUrl} sx={{ width: 28, height: 28 }} />
							<Typography variant="body2" sx={{ opacity: 0.8 }}>
								{user.global_name ?? user.username}
							</Typography>
							<Button color="inherit" size="small" onClick={logout} sx={{ opacity: 0.7 }}>
								{t("common.logout")}
							</Button>
						</Box>
					)}
				</Toolbar>
			</AppBar>
			<Box component="main" className="flex-1">
				<Outlet />
			</Box>
		</Box>
	);
}
