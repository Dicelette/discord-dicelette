import LogoutIcon from "@mui/icons-material/Logout";
import { Avatar, Box, ListItemIcon, Menu, MenuItem, Typography } from "@mui/material";
import { useState } from "react";
import { useI18n } from "../i18n";

interface Props {
	username: string;
	avatarUrl: string;
	onLogout: () => void;
}

export default function UserAvatarMenu({ username, avatarUrl, onLogout }: Props) {
	const { t } = useI18n();
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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
				<Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>
					{username}
				</Typography>
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
						onLogout();
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
