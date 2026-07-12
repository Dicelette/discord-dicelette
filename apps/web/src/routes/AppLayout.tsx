import { Box } from "@mui/material";
import { AppTopBar, DocsButton, UserAvatarMenu } from "@shared";
import { Outlet } from "react-router-dom";
import { useAuth } from "../providers";
import PlaygroundButton from "../shared/ui/PlaygroundButton.tsx";

export default function AppLayout() {
	const { user, logout } = useAuth();

	const avatarUrl = user?.avatar
		? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
		: "https://cdn.discordapp.com/embed/avatars/0.png";

	return (
		<Box className="min-h-screen flex flex-col">
			<AppTopBar
				leadingNav={
					<>
						<DocsButton />
						<PlaygroundButton />
					</>
				}
				trailingNav={
					user && (
						<UserAvatarMenu
							username={user.global_name ?? user.username}
							avatarUrl={avatarUrl}
							onLogout={logout}
						/>
					)
				}
			/>
			<Box component="main" className="flex-1">
				<Outlet />
			</Box>
		</Box>
	);
}
