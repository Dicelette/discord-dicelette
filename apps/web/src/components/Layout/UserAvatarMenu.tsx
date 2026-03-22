import LogoutIcon from "@mui/icons-material/Logout";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";

export default function UserAvatarMenu() {
	const { user, logout } = useAuth();
	const { t } = useI18n();
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

	if (!user) return null;

	const avatarUrl = user.avatar
		? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
		: "https://cdn.discordapp.com/embed/avatars/0.png";

	return (
		<>
			<Box
				className="flex items-center gap-2"
				onClick={(e) => setAnchorEl(e.currentTarget)}
				sx={{
					cursor: "pointer",
					px: 1.5,
					py: 0.5,
					borderRadius: 2,
					transition: "background 0.15s",
					"&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
					"&:active": { backgroundColor: "rgba(255,255,255,0.18)" },
				}}
			>
				<Typography variant="body2">{user.global_name ?? user.username}</Typography>
				<Avatar src={avatarUrl} sx={{ width: 28, height: 28 }} />
			</Box>
			<Menu
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={() => setAnchorEl(null)}
				transformOrigin={{ horizontal: "right", vertical: "top" }}
				anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
			>
				<MenuItem
					onClick={() => {
						logout();
						setAnchorEl(null);
					}}
				>
					<ListItemIcon>
						<LogoutIcon fontSize="small" />
					</ListItemIcon>
					{t("common.logout")}
				</MenuItem>
			</Menu>
		</>
	);
}
