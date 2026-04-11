import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import {
	DocsButton,
	LanguageSelect,
	ThemeToggleButton,
	UserAvatarMenu,
	useI18n,
} from "@shared";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../providers";

const appBarSx = { borderBottom: "1px solid rgba(255,255,255,0.08)" } as const;
const toolbarSx = {
	gap: { xs: 0.5, sm: 2 },
	flexWrap: "nowrap",
	backgroundColor: "var(--appbar-bg)",
} as const;
const logoButtonSx = { textTransform: "none", gap: 1, flexGrow: 0, minWidth: 0 } as const;
const appTitleSx = { fontWeight: 700, display: { xs: "none", sm: "block" } } as const;
const spacerSx = { flexGrow: 1 } as const;
const navBoxSx = {
	display: "flex",
	alignItems: "center",
	justifyContent: "flex-end",
	gap: { xs: 0.5, sm: 1 },
	flexWrap: "nowrap",
	width: "auto",
} as const;
const languageSelectSx = {
	color: "inherit",
	"& .MuiOutlinedInput-notchedOutline": {
		borderColor: "rgba(255,255,255,0.2)",
	},
	"& .MuiSvgIcon-root": { color: "inherit" },
} as const;

export default function AppLayout() {
	const { user, logout } = useAuth();
	const { t } = useI18n();

	const avatarUrl = user?.avatar
		? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
		: "https://cdn.discordapp.com/embed/avatars/0.png";

	return (
		<Box className="min-h-screen flex flex-col">
			<AppBar position="static" elevation={0} sx={appBarSx}>
				<Toolbar sx={toolbarSx}>
					<Button component={Link} to="/" color="inherit" sx={logoButtonSx}>
						<img
							src="/logo.png"
							alt="Dicelette"
							style={{ height: 28, width: 28, flexShrink: 0 }}
						/>
						<Typography variant="h6" component="span" sx={appTitleSx}>
							{t("login.title")}
						</Typography>
					</Button>
					<Box sx={spacerSx} />
					<Box sx={navBoxSx}>
						<DocsButton />
						<ThemeToggleButton />
						<LanguageSelect sx={languageSelectSx} />

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
