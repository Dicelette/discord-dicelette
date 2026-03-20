import { Outlet } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import { useAuth } from "../hooks/useAuth";

export default function Layout() {
	const { user, logout } = useAuth();

	const avatarUrl = user?.avatar
		? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
		: `https://cdn.discordapp.com/embed/avatars/0.png`;

	return (
		<Box className="min-h-screen flex flex-col">
			<AppBar position="static" elevation={0} sx={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
				<Toolbar>
					<Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
						🎲 Dicelette Dashboard
					</Typography>
					{user && (
						<Box className="flex items-center gap-3">
							<Avatar src={avatarUrl} sx={{ width: 32, height: 32 }} />
							<Typography variant="body2" sx={{ opacity: 0.8 }}>
								{user.global_name ?? user.username}
							</Typography>
							<Button color="inherit" size="small" onClick={logout} sx={{ opacity: 0.7 }}>
								Logout
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
