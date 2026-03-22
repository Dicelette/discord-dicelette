import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeModeProvider, useThemeMode } from "./hooks/useThemeMode";
import { I18nProvider } from "./i18n/provider";
import "./index.css";

function ThemedApp() {
	const { mode } = useThemeMode();

	const theme = useMemo(
		() =>
			createTheme({
				palette: {
					mode,
					primary: {
						main: "#5865f2",
					},
					secondary: {
						main: "#57f287",
					},
					background:
						mode === "dark"
							? { default: "#1a1a2e", paper: "#16213e" }
							: { default: "#f5f5f5", paper: "#ffffff" },
				},
				typography: {
					fontFamily: '"Atkinson Hyperlegible Next", "Inter", sans-serif',
				},
				components: {
					// biome-ignore lint/style/useNamingConvention: MUI requires PascalCase component keys
					MuiInputBase: {
						styleOverrides: {
							input: {
								fontFamily: '"Iosevka Charon", monospace',
							},
						},
					},
				},
			}),
		[mode],
	);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<BrowserRouter>
				<AuthProvider>
					<App />
				</AuthProvider>
			</BrowserRouter>
		</ThemeProvider>
	);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<I18nProvider>
			<ThemeModeProvider>
				<ThemedApp />
			</ThemeModeProvider>
		</I18nProvider>
	</React.StrictMode>,
);
