import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../providers";
import {
	DocsButton,
	LanguageSelect,
	ThemeToggleButton,
	UserAvatarMenu,
	useI18n,
} from "../shared";

export default function AppLayout() {
	const { user, logout } = useAuth();
	const { t } = useI18n();

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
				<Toolbar
					sx={{
						gap: { xs: 0.5, sm: 2 },
						flexWrap: "nowrap",
						backgroundColor: "var(--appbar-bg)",
					}}
				>
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
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "flex-end",
							gap: { xs: 0.5, sm: 1 },
							flexWrap: "nowrap",
							width: "auto",
						}}
					>
						<DocsButton />
						<ThemeToggleButton />
						<LanguageSelect
							sx={{
								color: "inherit",
								"& .MuiOutlinedInput-notchedOutline": {
									borderColor: "rgba(255,255,255,0.2)",
								},
								"& .MuiSvgIcon-root": { color: "inherit" },
							}}
						/>

						{user && (
							<UserAvatarMenu
								username={user.global_name ?? user.username}
								avatarUrl={avatarUrl}
								onLogout={logout}
							/>
						)}
					</Box>
				</Toolbar>
			</AppBar>
			<Box component="main" className="flex-1">
				<Outlet />
			</Box>
		</Box>
	);
}
