import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import LanguageSelect from "./LanguageSelect";
import ThemeToggleButton from "./ThemeToggleButton";

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

interface Props {
	/** Where the logo/wordmark links to. Defaults to the servers list. */
	logoHref?: string;
	/** Extra nav items rendered before the theme/language controls (e.g. docs, playground links). */
	leadingNav?: ReactNode;
	/** Extra nav items rendered after the theme/language controls (e.g. user avatar menu). */
	trailingNav?: ReactNode;
}

/** Top app bar shared by the authenticated dashboard layout and standalone public pages. */
export default function AppTopBar({ logoHref = "/", leadingNav, trailingNav }: Props) {
	const { t } = useI18n();

	return (
		<AppBar position="static" elevation={0} sx={appBarSx}>
			<Toolbar sx={toolbarSx}>
				<Button component={Link} to={logoHref} color="inherit" sx={logoButtonSx}>
					<img
						src="/logo.png"
						alt="Dicelette"
						width={28}
						height={28}
						loading="eager"
						style={{ flexShrink: 0 }}
					/>
					<Typography variant="h6" component="span" sx={appTitleSx}>
						{t("login.title")}
					</Typography>
				</Button>
				<Box sx={spacerSx} />
				<Box sx={navBoxSx}>
					{leadingNav}
					<ThemeToggleButton />
					<LanguageSelect sx={languageSelectSx} />
					{trailingNav}
				</Box>
			</Toolbar>
		</AppBar>
	);
}
